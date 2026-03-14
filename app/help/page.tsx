import { HelpLayout } from "@/components/help/HelpLayout";
import { helpSections } from "@/data/helpContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HelpPage() {
  return <HelpLayout sections={helpSections} />;
}
