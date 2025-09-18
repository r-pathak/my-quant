import { Research } from "@/components/views/Research";

interface ResearchPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function ResearchPage({ searchParams }: ResearchPageProps) {
  const ticker = typeof searchParams.ticker === 'string' ? searchParams.ticker : undefined;
  return <Research initialTicker={ticker} />;
}
