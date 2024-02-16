import {
  $,
  Fragment,
  component$,
  useSignal,
  useVisibleTask$,
} from "@builder.io/qwik";
import {
  type DocumentHead,
  routeLoader$,
  server$,
} from "@builder.io/qwik-city";
import type { EnvGetter } from "@builder.io/qwik-city/middleware/request-handler";
import { Redis } from "@upstash/redis/cloudflare";
import * as cheerio from "cheerio";

type Submission = {
  id: number;
  problem: string;
  input: string;
  result: "ac" | "wa";
  time: Date;
};

export const getRandomProblem = async (
  env: EnvGetter,
): Promise<Problem | null> => {
  const BOJ = new Redis({
    url: env.get("UPSTASH_REDIS_REST_URL")!,
    token: env.get("UPSTASH_REDIS_REST_TOKEN")!,
  });
  const maxId = +(import.meta.env.PUBLIC_MAX_ID || "30000");
  // eslint-disable-next-line
  while (true) {
    const id = (Math.floor(Math.random() * (maxId - 1000)) + 1000).toString();
    let text = (await BOJ.get<string>(id)) || null;
    let title = (await BOJ.get<string>(`${id}-title`)) || null;
    if (text === null || title === null) {
      const request = await fetch(`https://www.acmicpc.net/problem/${id}`);
      if (request.status !== 200) continue;
      const $ = cheerio.load(await request.text());
      text = $("#problem_description").prop("innerText");
      if (!text) return null;
      title = $("#problem_title").prop("innerHTML");
      if (!title) return null;
      await BOJ.set(id, text);
      await BOJ.set(`${id}-title`, title);
    }
    const lines = [];
    for (const match of text.matchAll(/[^.。．]+[.。．]/g)) {
      const line = match[0].trim();
      if (line.length) lines.push(line);
    }
    if (lines.length === 0) {
      lines.push("");
    }
    const random = Math.floor(Math.random() * lines.length);
    return {
      id,
      title,
      line: lines[random],
    };
  }
};

export const useFirstProblem = routeLoader$(async ({ env }) => {
  return getRandomProblem(env);
});

const getRandomProblemAction = server$(async function () {
  return getRandomProblem(this.env);
});

type Problem = {
  id: string;
  title: string;
  line: string;
};

export default component$(() => {
  const firstProblem = useFirstProblem();
  const problem = useSignal<Problem | null>(firstProblem.value);

  const submissions = useSignal<Submission[]>([]);
  const problemId = useSignal<string>("");
  const problemTitle = useSignal<string>("");
  const currentProblem = problem.value;
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => problem.value?.line || true);
    (window as any).renderMathInElement(document.getElementById("line"), {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\begin{equation}", right: "\\end{equation}", display: true },
        { left: "\\begin{align}", right: "\\end{align}", display: true },
        { left: "\\begin{alignat}", right: "\\end{alignat}", display: true },
        { left: "\\begin{gather}", right: "\\end{gather}", display: true },
        { left: "\\begin{CD}", right: "\\end{CD}", display: true },
        { left: "\\[", right: "\\]", display: true },
      ],
    });
  });
  if (!currentProblem) return <div>오류</div>;
  const onSubmit = $(async () => {
    let result: "ac" | "wa" | null = null;
    let input = null;
    if (problemId.value.trim().length > 0) {
      input = problemId.value;
      result = currentProblem.id === problemId.value ? "ac" : "wa";
    }
    if (problemTitle.value.trim().length > 0) {
      input = problemTitle.value;
      result = currentProblem.title === problemTitle.value ? "ac" : "wa";
    }
    if (result !== null && input !== null) {
      const id = Math.random();
      const r = result;
      const i = input;
      submissions.value = [
        {
          id,
          problem: currentProblem.line,
          input: i,
          result: r,
          time: new Date(),
        },
        ...submissions.value,
      ];
      if (result === "ac") problem.value = await getRandomProblemAction();
      problemId.value = "";
      problemTitle.value = "";
    }
  });
  return (
    <div class="container content">
      <ul class="menu">
        <li class="selected pointer">
          <input
            bind:value={problemId}
            name="id"
            class="id question"
            type="text"
            minLength={4}
            maxLength={5}
            inputMode="numeric"
            placeholder="????"
          />
          번
        </li>
        <li>
          <button
            type="button"
            class="ghost pointer"
            onClick$={onSubmit}
            document:onKeyPress$={async (e) => {
              if (e.key === "Enter") await onSubmit();
            }}
          >
            제출
          </button>
        </li>
        <li>
          <button
            type="button"
            class="ghost pointer"
            onClick$={async () => {
              problem.value = await getRandomProblemAction();
            }}
          >
            문제 변경
          </button>
        </li>
      </ul>
      <div class="header">
        <input
          class="title question"
          bind:value={problemTitle}
          name="title"
          type="text"
          placeholder="? ? ?"
        />
      </div>
      <section class="problem">
        <div class="sep">
          <h2 class="legend">문제</h2>
        </div>
        <p id="line" dangerouslySetInnerHTML={currentProblem.line} />
      </section>
      <div class="table">
        <span class="th">문제</span>
        <span class="th">입력</span>
        <span class="th">결과</span>
        <span class="th">제출한 시간</span>
        {submissions.value.map(({ id, problem, input, result, time }) => (
          <Fragment key={id}>
            <span class="td" dangerouslySetInnerHTML={problem} />
            <span class="td" dangerouslySetInnerHTML={input} />
            <span class={{ [result]: true, td: true }}>
              {result === "ac" ? "맞았습니다!!" : "틀렸습니다"}
            </span>
            <span class="td">
              {new Intl.DateTimeFormat("ko-kr", {
                dateStyle: "short",
                timeStyle: "medium",
              }).format(time)}
            </span>
          </Fragment>
        ))}
      </div>
    </div>
  );
});

export const head: DocumentHead = {
  title: "Baekjoon Oneline Judge",
  meta: [
    {
      name: "description",
      content: "한 문장으로 BOJ 문제를 맞혀 보자!",
    },
  ],
};
