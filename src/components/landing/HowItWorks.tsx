import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/landing/ui/card";
import { UserPlus, PenLine, ShoppingBag, Share2 } from "lucide-react";

interface StepProps {
  icon: React.ReactNode;
  step: string;
  title: string;
  description: string;
}

const steps: StepProps[] = [
  {
    icon: <UserPlus className="w-8 h-8 text-green-600" />,
    step: "01",
    title: "Log in to your account",
    description: "Access your dashboard instantly from any device.",
  },
  {
    icon: <PenLine className="w-8 h-8 text-green-600" />,
    step: "02",
    title: "Draw your floor plan",
    description: "Click to place walls and define rooms.",
  },
  {
    icon: <ShoppingBag className="w-8 h-8 text-green-600" />,
    step: "03",
    title: "Furnish the space",
    description: "Drag furniture from the catalog onto your plan.",
  },
  {
    icon: <Share2 className="w-8 h-8 text-green-600" />,
    step: "04",
    title: "Share or export",
    description: "Copy a read-only link for your client, or export as a branded PDF.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="w-full flex flex-col items-center py-24 sm:py-32 px-4">
      <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-black mb-4 text-center hover:text-[#1bc650] transition-colors duration-300 cursor-default">
        How it works
      </h2>
      <p className="text-center md:w-3/4 mx-auto mb-12 text-xl text-muted-foreground">
        From blank canvas to client-ready proposal in four steps — no CAD
        experience required.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl mx-auto pt-8">
        {steps.map(({ icon, step, title, description }) => (
          <Card key={title} className="shadow-2xl border border-gray-50/50 hover:-translate-y-2 transition-transform duration-300 bg-white p-2 relative overflow-hidden text-left">
            <div className="absolute top-4 right-4 text-7xl font-black text-green-50 select-none -z-10">
              {step}
            </div>
            <CardHeader className="flex flex-col items-center gap-4 pb-4">
              <div className="bg-green-100/70 p-3 rounded-xl mt-4">
                {icon}
              </div>
              <div className="flex flex-col text-center">
                <CardTitle className="text-lg font-bold">{title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-lg text-gray-600 leading-relaxed text-center pb-4 relative z-10">
              {description}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
