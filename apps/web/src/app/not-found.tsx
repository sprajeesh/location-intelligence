import { NotFoundContent } from "@/components/NotFoundContent";

export default function NotFound() {
  return (
    <NotFoundContent message="Page not found" backHomeLabel="Go home" homeHref="/en" />
  );
}
