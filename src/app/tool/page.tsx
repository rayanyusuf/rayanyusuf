import Image from "next/image";

const problems = [
  {
    id: "further-maths-june-2023-paper-2-question-3",
    src: "/problems/further-maths-june-2023-paper-2-question-3.png",
    alt: "Further Maths June 2023 Paper 2 Question 3",
  },
  {
    id: "further-maths-june-2024-paper-1-question-5",
    src: "/problems/further-maths-june-2024-paper-1-question-5.png",
    alt: "Further Maths June 2024 Paper 1 Question 5",
  },
  {
    id: "further-maths-june-2024-paper-1-question-8",
    src: "/problems/further-maths-june-2024-paper-1-question-8.png",
    alt: "Further Maths June 2024 Paper 1 Question 8",
  },
  {
    id: "further-maths-sample-paper-1-question-2",
    src: "/problems/further-maths-sample-paper-1-question-2.png",
    alt: "Further Maths Sample Paper 1 Question 2",
  },
  {
    id: "further-maths-sample-paper-1-question-3",
    src: "/problems/further-maths-sample-paper-1-question-3.png",
    alt: "Further Maths Sample Paper 1 Question 3",
  },
  {
    id: "further-maths-sample-paper-1-question-8",
    src: "/problems/further-maths-sample-paper-1-question-8.png",
    alt: "Further Maths Sample Paper 1 Question 8",
  },
  {
    id: "further-maths-sample-paper-2-question-1",
    src: "/problems/further-maths-sample-paper-2-question-1.png",
    alt: "Further Maths Sample Paper 2 Question 1",
  },
  {
    id: "further-maths-sample-paper-2-question-2",
    src: "/problems/further-maths-sample-paper-2-question-2.png",
    alt: "Further Maths Sample Paper 2 Question 2",
  },
  {
    id: "further-maths-sample-paper-2-question-3",
    src: "/problems/further-maths-sample-paper-2-question-3.png",
    alt: "Further Maths Sample Paper 2 Question 3",
  },
  {
    id: "further-maths-sample-paper-2-question-4",
    src: "/problems/further-maths-sample-paper-2-question-4.png",
    alt: "Further Maths Sample Paper 2 Question 4",
  },
];

export default function ToolPage() {
  const randomIndex = Math.floor(Math.random() * problems.length);
  const problem = problems[randomIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <main className="w-full max-w-4xl px-4 py-8 flex items-center justify-center">
        <div className="w-full flex flex-col items-center justify-center">
          <Image
            src={problem.src}
            alt={problem.alt}
            width={1200}
            height={800}
            className="w-full h-auto max-h-[80vh] object-contain rounded-lg shadow-2xl bg-slate-900"
            priority
          />
        </div>
      </main>
    </div>
  );
}

