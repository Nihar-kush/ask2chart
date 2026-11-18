import type { ExplanationRequest } from "@/types/analysis";

const monthKey = /^(\d{4})-(0[1-9]|1[0-2])$/;
const numericValue = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const monthName = new Intl.DateTimeFormat("en", {
  month: "long",
  timeZone: "UTC",
});
const monthFormat = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const listFormat = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});
const roundedNumber = new Intl.NumberFormat("en", {
  maximumSignificantDigits: 6,
});
const percentage = new Intl.NumberFormat("en", {
  style: "percent",
  maximumFractionDigits: 1,
});

export type Observation = {
  id: string;
  topic: string;
  text: string;
  period?: { from: number; to: number };
  continuation?: string;
  insight?: boolean;
  covers?: string[];
};
type MonthValue = ChartValue & { month: number; monthName: string };
type MonthlyMove = { from: MonthValue; to: MonthValue; difference: number };
type ChartValue = {
  label: string;
  month: number | null;
  monthName?: string;
  raw: string;
  value: number;
  text: string;
};

function formatValue(value: string) {
  return value.replace(
    /^(-?\d+)(\.\d+)?$/,
    (_, whole: string, fraction?: string) =>
      whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
      (fraction?.replace(/0+$/, "").replace(/\.$/, "") ?? ""),
  );
}

function metricName({ metricLabel, aggregation }: ExplanationRequest) {
  const label = metricLabel.trim();
  const name =
    aggregation === "sum" && label.startsWith("Total ")
      ? label.slice("Total ".length).trim()
      : label;
  return (name || label)
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .replace(/(?<=[\p{L}\p{N}])_+(?=[\p{L}\p{N}])/gu, " ")
    .replace(/(^|\s)\p{Lu}(?=\p{Ll})/gu, (start) => start.toLowerCase());
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatPercentage(value: number) {
  if (value > 0 && value < 0.001) return "less than 0.1%";
  if (value < 1 && value > 0.9995) return "more than 99.9%";
  const formatted = percentage.format(value);
  return Number.parseFloat(formatted.replaceAll(",", "")) / 100 === value
    ? formatted
    : `about ${formatted}`;
}

function formatDifference(
  from: ChartValue,
  to: ChartValue,
  difference: number,
) {
  const decimal = /^([+-]?\d+)(?:\.(\d+))?$/;
  const start = decimal.exec(from.raw);
  const end = decimal.exec(to.raw);
  if (!start || !end)
    return `about ${roundedNumber.format(Math.abs(difference))}`;

  // Scale the original decimals before subtracting to avoid floating-point artifacts
  const places = Math.max(start[2]?.length ?? 0, end[2]?.length ?? 0);
  const scaled = (parts: RegExpExecArray) =>
    BigInt(parts[1] + (parts[2] ?? "").padEnd(places, "0"));
  const delta = scaled(end) - scaled(start);
  const digits = (delta < 0n ? -delta : delta)
    .toString()
    .padStart(places + 1, "0");
  return formatValue(
    places ? `${digits.slice(0, -places)}.${digits.slice(-places)}` : digits,
  );
}

function monthRange(from: MonthValue, to: MonthValue) {
  const sameYear = Math.floor(from.month / 12) === Math.floor(to.month / 12);
  return `${sameYear ? from.monthName : from.label} to ${to.label}`;
}

function changeAmount(from: ChartValue, to: ChartValue) {
  const difference = to.value - from.value;
  if (!Number.isFinite(difference)) return "";

  const amount = formatDifference(from, to, difference);
  const relative =
    from.value > 0 && to.value >= 0 ? Math.abs(difference / from.value) : 0;
  return relative > 0 && Number.isFinite(relative)
    ? `${amount} (${formatPercentage(relative)})`
    : amount;
}

function describeChange(from: ChartValue, to: ChartValue) {
  if (to.value === from.value) return `stayed at ${from.text}`;

  const direction = to.value > from.value ? "rose" : "fell";
  const amount = changeAmount(from, to);
  return `${direction}${amount ? ` by ${amount}` : ""}, from ${from.text} to ${to.text}`;
}

function movementTopic({ from, to }: MonthlyMove) {
  return `change-${from.month}-${to.month}`;
}

function turningPoints(changes: MonthlyMove[], metric: string): Observation[] {
  const runs: MonthlyMove[] = [];
  for (const change of changes) {
    if (!Number.isFinite(change.difference) || change.difference === 0)
      continue;

    const run = runs.at(-1);
    if (
      run?.to === change.from &&
      Math.sign(run.difference) === Math.sign(change.difference)
    ) {
      run.to = change.to;
      run.difference = run.to.value - run.from.value;
    } else {
      runs.push({ ...change });
    }
  }

  const turns = runs.slice(1).flatMap((after, index) => {
    const before = runs[index];
    if (
      before.to !== after.from ||
      !Number.isFinite(before.difference) ||
      !Number.isFinite(after.difference)
    )
      return [];
    return [{ before, after, next: runs[index + 2] }];
  });
  const strength = ({ before, after }: (typeof turns)[number]) =>
    Math.min(Math.abs(before.difference), Math.abs(after.difference));
  const ranked = turns.toSorted((a, b) => strength(b) - strength(a));
  const [strongest] = ranked;
  if (!strongest) return [];

  const endMonthOf = ({ before, after, next }: (typeof ranked)[number]) =>
    before.difference > 0 &&
    next?.from === after.to &&
    next.difference > 0 &&
    Number.isFinite(next.difference)
      ? next.to.month
      : after.to.month;
  const other = ranked.find(
    (turn) =>
      endMonthOf(turn) <= strongest.before.from.month ||
      turn.before.from.month >= endMonthOf(strongest),
  );
  return (other ? [strongest, other] : [strongest]).map(
    ({ before, after, next }, index) => {
      const rose = before.difference > 0;
      const endMonth =
        Math.floor(after.to.month / 12) === Math.floor(before.to.month / 12)
          ? after.to.monthName
          : after.to.label;
      const first =
        before.to.month - before.from.month > 1
          ? `From ${monthRange(before.from, before.to)}, ${metric} ${rose ? "rose" : "fell"} each month, changing by ${changeAmount(before.from, before.to)} from ${before.from.text} to ${before.to.text}.`
          : `From ${monthRange(before.from, before.to)}, ${metric} ${describeChange(before.from, before.to)}.`;
      const second =
        after.to.month - after.from.month > 1
          ? `It then ${rose ? "fell" : "rose"} each month through ${endMonth}, ${rose ? "losing" : "gaining"} ${changeAmount(after.from, after.to)} to finish that run at ${after.to.text}.`
          : `It then ${rose ? "fell" : "rose"} by ${changeAmount(after.from, after.to)} to ${after.to.text} in ${endMonth}.`;
      const covers = [movementTopic(before), movementTopic(after)];
      let recovery = "";
      if (
        rose &&
        next?.from === after.to &&
        next.difference > 0 &&
        Number.isFinite(next.difference)
      ) {
        const regained = next.difference / Math.abs(after.difference);
        const month =
          Math.floor(next.to.month / 12) === Math.floor(after.to.month / 12)
            ? next.to.monthName
            : next.to.label;
        recovery = ` By ${month}, it had gained back ${formatDifference(next.from, next.to, next.difference)}, reaching ${next.to.text}`;
        if (next.to.value === after.from.value)
          recovery += ", regaining the full decline";
        else if (next.to.value > after.from.value)
          recovery += ", surpassing its level before the drop";
        else if (regained > 0)
          recovery += `, regaining ${formatPercentage(regained)} of the decline`;
        recovery += ".";
        covers.push(movementTopic(next));
      }

      const end = recovery && next ? next.to.month : after.to.month;
      // The full pattern already explains the individual moves inside it
      for (const change of changes) {
        if (change.from.month >= before.from.month && change.to.month <= end) {
          covers.push(movementTopic(change));
        }
      }

      return {
        id: `turning-point-${index + 1}`,
        topic: `turning-point-${index + 1}`,
        insight: true,
        covers: [...new Set(covers)],
        period: { from: before.from.month, to: end },
        text: `${first} ${second}${recovery}`,
      };
    },
  );
}

function addMonthlyObservations(
  facts: Observation[],
  values: MonthValue[],
  metric: string,
) {
  const months = values.toSorted((a, b) => a.month - b.month);
  const first = months[0];
  const last = months[months.length - 1];
  const changes = months.slice(1).flatMap((to, index) => {
    const from = months[index];
    return to.month === from.month + 1
      ? [{ from, to, difference: to.value - from.value }]
      : [];
  });
  facts.push(...turningPoints(changes, metric));

  const overallTopic = `change-${first.month}-${last.month}`;
  const allConsecutive = changes.length === months.length - 1;
  const rising = changes.filter(({ difference }) => difference > 0);
  const falling = changes.filter(({ difference }) => difference < 0);
  const steadyDirection =
    allConsecutive &&
    months.length > 2 &&
    (rising.length === changes.length || falling.length === changes.length);
  const netChange =
    first.value === last.value
      ? `ended where it started, at ${last.text}`
      : describeChange(first, last);

  facts.push({
    id: "overall",
    topic: overallTopic,
    insight: true,
    text: steadyDirection
      ? `${capitalize(metric)} ${rising.length ? "rose" : "fell"} each month from ${monthRange(first, last)}. Over that span, it ${describeChange(first, last)}.`
      : `Over the period from ${monthRange(first, last)}, ${metric} ${netChange}.`,
    period: { from: first.month, to: last.month },
    continuation: steadyDirection
      ? `it ${rising.length ? "rose" : "fell"} each month, finishing at ${last.text}`
      : `it ${netChange}`,
  });

  if (changes.length >= 5 && rising.length > 0 && falling.length > 0) {
    const flat = changes.length - rising.length - falling.length;
    const mix = `rose in ${rising.length} of ${changes.length} month-to-month comparisons and fell in ${falling.length}${flat ? `, with ${flat} unchanged` : ""}`;
    facts.push({
      id: "direction-mix",
      topic: "direction-mix",
      insight: true,
      text: `${capitalize(metric)} ${mix}.`,
      continuation: `Across the months shown, it ${mix}.`,
    });
  }

  const latest = changes.find(({ to }) => to === last);
  if (latest && months.length > 2 && !steadyDirection) {
    facts.push({
      id: "latest",
      topic: movementTopic(latest),
      insight: latest.difference !== 0,
      text: `In ${last.label}, ${metric} ${describeChange(latest.from, last)} compared with the previous month.`,
      period: { from: latest.from.month, to: last.month },
      continuation: `it ${describeChange(latest.from, last)}`,
    });
  }

  if (changes.length < 2) return;
  for (const [direction, ordered] of [
    ["rise", rising.toSorted((a, b) => b.difference - a.difference)],
    ["drop", falling.toSorted((a, b) => a.difference - b.difference)],
  ] as const) {
    const [largest, next] = ordered;
    if (!largest || !Number.isFinite(largest.difference)) continue;
    const { from, to, difference } = largest;
    const amount = changeAmount(from, to);
    const tied =
      next &&
      roundedNumber.format(Math.abs(next.difference)) ===
        roundedNumber.format(Math.abs(difference));
    const highlight = tied
      ? `one of its largest monthly ${direction}s`
      : `its largest monthly ${direction}`;
    const verb = direction === "rise" ? "rose" : "fell";
    facts.push({
      id: `largest-${direction}`,
      topic: movementTopic(largest),
      insight: true,
      text: `In ${to.label}, ${metric} ${verb} from ${from.text} to ${to.text}. That was ${highlight} in the period shown, a change of ${amount}.`,
      period: { from: from.month, to: to.month },
      continuation: `it ${verb} by ${amount} to ${to.text}, ${highlight} shown`,
    });
  }
}

function addCategoryObservations(
  facts: Observation[],
  ranked: ChartValue[],
  payload: ExplanationRequest,
  metric: string,
) {
  const groupsByValue = new Map<number, ChartValue[]>();
  for (const row of ranked) {
    const group = groupsByValue.get(row.value);
    if (group) group.push(row);
    else groupsByValue.set(row.value, [row]);
  }
  const ranksByValue = [...groupsByValue.values()];
  for (const [direction, ranks] of [
    ["highest", ranksByValue],
    ["lowest", ranksByValue.toReversed()],
  ] as const) {
    if (ranks.length < 3) continue;
    const rankCount = ranks.length >= 6 ? 3 : 2;
    const labels = ranks.slice(0, rankCount).map((rank) => {
      const names = rank.slice(0, 2).map(({ label }) => label);
      if (rank.length > 2) names.push(`${rank.length - 2} more`);
      return `${listFormat.format(names)} at ${rank[0].text}`;
    });
    facts.push({
      id: `rank-${direction}`,
      topic: direction,
      text: `${direction === "highest" ? "The leaders" : "The lowest groups"} by ${metric} were ${listFormat.format(labels)}.`,
    });
  }

  const [leader, runnerUp] = ranked;
  const gap = runnerUp ? leader.value - runnerUp.value : 0;
  if (runnerUp && gap > 0 && Number.isFinite(gap)) {
    facts.push({
      id: "lead",
      topic: "highest",
      insight: true,
      text: `${leader.label} led ${runnerUp.label} by ${changeAmount(runnerUp, leader)} in ${metric} (${leader.text} versus ${runnerUp.text}).`,
    });
  }

  const canShare =
    (payload.aggregation === "sum" || payload.aggregation === "count") &&
    ranked.length === payload.resultGroupCount &&
    ranked.every(({ value }) => value >= 0);
  const total = canShare
    ? ranked.reduce((sum, { value }) => sum + value, 0)
    : 0;
  if (
    ranked.length >= 3 &&
    total > 0 &&
    Number.isFinite(total) &&
    runnerUp.value > 0 &&
    runnerUp.value > ranked[2].value
  ) {
    const combinedShare = (leader.value + runnerUp.value) / total;
    facts.push({
      id: "concentration",
      topic: "concentration",
      insight: true,
      covers: ["category-1", "category-2"],
      text: `Together, ${leader.label} and ${runnerUp.label} accounted for ${formatPercentage(combinedShare)} of the ${metric} shown.`,
    });
  }

  ranked.forEach((row, index) => {
    const share =
      total > 0 && Number.isFinite(total) ? row.value / total : null;
    const id = `category-${index + 1}`;
    const contribution =
      share !== null && (share > 0 || row.value === 0)
        ? `${row.label} accounted for ${formatPercentage(share)}`
        : null;
    facts.push({
      id,
      topic: id,
      insight: contribution !== null,
      text: contribution
        ? `${contribution} of the ${metric} shown.`
        : `${row.label} recorded ${row.text} in ${metric}.`,
      continuation: contribution
        ? `${contribution} of the total shown.`
        : undefined,
    });
  });
}

export function getExplanationFacts(
  payload: ExplanationRequest,
): Observation[] {
  const metric = metricName(payload);
  const values = payload.rows.flatMap<ChartValue>(({ group, value }) => {
    if (value === null || !numericValue.test(value)) return [];
    const number = Number(value);
    if (!Number.isFinite(number)) return [];

    const month = payload.groupByMonth ? monthKey.exec(group) : null;
    const date = month ? new Date(`${group}-01T00:00:00Z`) : null;
    return [
      {
        label: date ? monthFormat.format(date) : `“${group}”`,
        month: month ? Number(month[1]) * 12 + Number(month[2]) - 1 : null,
        monthName: date ? monthName.format(date) : undefined,
        raw: value,
        value: number,
        text: formatValue(value),
      },
    ];
  });

  const [first] = values;
  if (!first) {
    return [
      {
        id: "missing",
        topic: "values",
        text:
          payload.resultGroupCount === 1
            ? `The group shown has no numeric result for ${metric}.`
            : `None of the groups shown have a numeric result for ${metric}.`,
      },
    ];
  }

  if (values.length === 1) {
    const label = payload.aggregation === "sum" ? `total ${metric}` : metric;
    const where = first.month === null ? "for" : "in";
    const single = `${capitalize(label)} was ${first.text} ${where} ${first.label}`;
    const direction = payload.chartLimit === 1 ? payload.metricSort : undefined;

    return [
      {
        id: "single",
        topic: "values",
        text: direction
          ? `${first.label} had the ${direction === "asc" ? "lowest" : "highest"} ${label} in this analysis, at ${first.text}.`
          : payload.resultGroupCount === 1
            ? `${single}.`
            : `${single}, the only group shown with a numeric result.`,
      },
    ];
  }

  const ranked = values.toSorted((a, b) => b.value - a.value);
  // Distinct totals can round to the same number before the chart is drawn
  const hasRoundedTie = ranked.some((row, index) => {
    const next = ranked[index + 1];
    return next?.value === row.value && next.text !== row.text;
  });
  if (hasRoundedTie) {
    return [
      {
        id: "count",
        topic: "values",
        text: `${values.length} groups have a numeric result for ${metric}.`,
      },
    ];
  }
  const isCategoryChart = payload.chartType === "bar" && !payload.groupByMonth;
  const facts: Observation[] = [];
  if (ranked[0].value === ranked[ranked.length - 1].value) {
    facts.push({
      id: "equal",
      topic: "values",
      text: `${capitalize(metric)} was the same across all ${values.length} groups with results, at ${first.text}.`,
    });
    if (isCategoryChart && first.value > 0)
      addCategoryObservations(facts, ranked, payload, metric);
    return facts;
  }
  for (const [id, extreme] of [
    ["highest", ranked[0]],
    ["lowest", ranked[ranked.length - 1]],
  ] as const) {
    const matches = ranked.filter(({ value }) => value === extreme.value);
    const where = extreme.month === null ? "for" : "in";
    const names = matches.slice(0, 2).map(({ label }) => label);
    if (matches.length > 2) names.push(`${matches.length - 2} more`);
    facts.push({
      id,
      topic: id,
      text: `${capitalize(metric)} was ${id} ${where} ${listFormat.format(names)}, at ${extreme.text}.`,
    });
  }

  const mean = values.reduce(
    (sum, { value }) => sum + value / values.length,
    0,
  );
  if (Number.isFinite(mean)) {
    const group = payload.groupByMonth ? "month" : "group";
    const formatted = roundedNumber.format(mean);
    const amount =
      Number(formatted.replaceAll(",", "")) === mean
        ? formatted
        : `about ${formatted}`;
    facts.push({
      id: "average",
      topic: "average",
      text:
        payload.aggregation === "avg"
          ? `The ${metric} figures averaged ${amount}, with each ${group} weighted equally.`
          : `Across the ${group}s shown, ${metric} averaged ${amount}.`,
    });
  }

  if (
    values.every(
      (row): row is MonthValue =>
        row.month !== null && row.monthName !== undefined,
    )
  ) {
    const monthly: Observation[] = [];
    addMonthlyObservations(monthly, values, metric);
    if (payload.question?.trim()) return [...monthly, ...facts];

    const covered = new Set(monthly.flatMap((fact) => fact.covers ?? []));
    return [
      ...monthly.filter(({ topic }) => !covered.has(topic)),
      ...facts.filter(({ id }) => id !== "highest" && id !== "lowest"),
    ];
  } else if (isCategoryChart) {
    addCategoryObservations(facts, ranked, payload, metric);
    const hasComparison = facts.some(
      ({ id }) => id === "lead" || id === "rank-highest",
    );
    if (!payload.question?.trim() && hasComparison) {
      return facts.filter(({ id }) => id !== "highest" && id !== "lowest");
    }
  }
  return facts;
}

export function explanationBudget(facts: Observation[], groupCount: number) {
  const topics = new Set(facts.map(({ topic }) => topic));
  const insights = new Set(
    facts.filter(({ insight }) => insight).map(({ topic }) => topic),
  );
  const budget =
    groupCount >= 10 && insights.size >= 5
      ? { length: "120–200 words", maxFacts: 7 }
      : groupCount >= 4 && insights.size >= 2
        ? { length: "60–120 words", maxFacts: 5 }
        : { length: "30–60 words", maxFacts: 3 };
  return { ...budget, maxFacts: Math.min(budget.maxFacts, topics.size) };
}

export function formatObservation(fact: Observation, previous?: Observation) {
  if (!previous || !fact.continuation) return fact.text;
  if (!fact.period) return fact.continuation;
  if (!previous.period) return fact.text;

  const { from, to } = fact.period;
  const { continuation } = fact;
  const before = previous.period;
  if (fact.id === "overall") {
    const year = Math.floor(from / 12);
    if (
      [to, before.from, before.to].every(
        (month) => Math.floor(month / 12) === year,
      )
    ) {
      const name = (month: number) =>
        monthName.format(new Date(Date.UTC(2000, month % 12)));
      return `Overall, between ${name(from)} and ${name(to)}, ${continuation}.`;
    }
  } else if (before.to === from) {
    return `The next month, ${continuation}.`;
  } else if (before.from === to && before.to === to + 1) {
    return `A month earlier, ${continuation}.`;
  }
  return fact.text;
}
