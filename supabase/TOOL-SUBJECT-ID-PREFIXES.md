# Tool subject tabs (`/tool`)

The practice tool filters questions by **`problem_id` prefix** (no DB column required).

| Tab            | `problem_id` must start with (case-insensitive) |
|----------------|--------------------------------------------------|
| Further Maths  | `Further-Maths`                                  |
| Physics        | `Physics`                                        |
| Chemistry      | `Chemistry`                                      |
| Math           | `Math-` or `Mathematics-` (not Further-Maths)    |

Examples:

- `Further-Maths-2024-paper-1-Question-3` → **Further Maths**
- `Physics-2023-paper-2-Question-1` → **Physics**
- `Math-2022-paper-1-Question-2` → **Math**

IDs that don’t match any rule are grouped under **Math** (fallback).

Answer rows should follow the same prefix and use `-paper-` / `-Answers-` patterns so `candidateAnswerIds` can match mark schemes.
