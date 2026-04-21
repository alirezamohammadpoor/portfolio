interface TechStackProps {
  items: string[];
}

export default function TechStack({ items }: TechStackProps) {
  return <p className="mt-2 text-sub text-primary">{items.join(", ")}</p>;
}
