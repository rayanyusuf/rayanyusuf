const videos = [
  { 
    id: "MLYqaM7S5Mw", 
    url: "https://youtu.be/MLYqaM7S5Mw",
    title: "Ch 2 Argand Diagrams Worksheet"
  },
  { 
    id: "wEIer1H-K3Y", 
    url: "https://youtu.be/wEIer1H-K3Y",
    title: "Further Math - June 2021 - Paper 1 - Question 1"
  },
  { 
    id: "zN_xb7G7eSE", 
    url: "https://youtu.be/zN_xb7G7eSE",
    title: "Further Math - November 2021 - Paper 2"
  },
  { 
    id: "UwNwCCz9Fss", 
    url: "https://youtu.be/UwNwCCz9Fss",
    title: "Further Math - June 2020 - Paper 2 - Question 7"
  },
  { 
    id: "Kl102oZX23I", 
    url: "https://youtu.be/Kl102oZX23I",
    title: "Further Math - June 2020 - Paper 2 - Question 2"
  },
  { 
    id: "gDMFbesrKRU", 
    url: "https://youtu.be/gDMFbesrKRU",
    title: "June 2024 QP1 Q1 Complex Numbers" 
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl lg:text-6xl">
            Rayans Academy
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400 sm:text-xl">
            Past paper solutions and tutorials posted by a 17 year old A Level student passionate about mathematics
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
            Currently studying at British School Dhahran, Saudi Arabia
          </p>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="group overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300 hover:shadow-2xl dark:bg-slate-800"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-200 dark:bg-slate-700">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${video.id}`}
                  title={video.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="p-4">
                <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-50">
                  {video.title}
                </h3>
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 transition-colors hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Watch on YouTube
                  <svg
                    className="ml-1 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-slate-500 dark:text-slate-400">
          <p></p>
        </div>
      </main>
    </div>
  );
}
