import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/landing/ui/card";
import { Badge } from "@/components/landing/ui/badge";
import {
  Ruler,
  Armchair,
  DollarSign,
  Share2,
  FileDown,
  Grid3x3,
  DoorOpen,
  RotateCw,
} from "lucide-react";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const features: FeatureCardProps[] = [
  {
    icon: <Ruler className="w-6 h-6 text-green-600" />,
    title: "Scale-accurate rooms",
    description: "Draw multi-room floor plans at real-world scale.",
  },
  {
    icon: <Armchair className="w-6 h-6 text-green-600" />,
    title: "Drag-and-drop furniture",
    description: "Browse a catalog of real furniture. Drag to place, rotate freely, and snap to grid.",
  },
  {
    icon: <DollarSign className="w-6 h-6 text-green-600" />,
    title: "Live budget panel",
    description: "The budget panel updates in real time as you add or remove items.",
  },
  {
    icon: <Share2 className="w-6 h-6 text-green-600" />,
    title: "Client share links",
    description: "Generate a read-only link your client can open on any device.",
  },
  {
    icon: <FileDown className="w-6 h-6 text-green-600" />,
    title: "Export PDF & PNG",
    description: "One-click export as a branded PDF or a plain PNG image.",
  },
  {
    icon: <Grid3x3 className="w-6 h-6 text-green-600" />,
    title: "Floor textures",
    description: "Apply wood, tile, marble, or carpet textures to each room.",
  },
  {
    icon: <DoorOpen className="w-6 h-6 text-green-600" />,
    title: "Doors & openings",
    description: "Place single, double, or sliding doors on any wall.",
  },
  {
    icon: <RotateCw className="w-6 h-6 text-green-600" />,
    title: "Undo / redo history",
    description: "Full undo and redo stack so you can experiment freely.",
  },
];



export const Features = () => {
  return (
    <section id="features" className="w-full flex flex-col items-center py-24 sm:py-32 space-y-8 px-4">
      <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-black mb-8 text-center hover:text-[#1bc650] transition-colors duration-300 cursor-default">
        Everything you need to design & deliver
      </h2>
      <p className="text-center text-muted-foreground md:w-2/3 mx-auto text-xl">
        FloorPlan Pro is purpose-built for interior designers and real estate
        professionals who need to go from blank canvas to client-ready proposal —
        fast.
      </p>

      {/* Feature cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 w-full max-w-7xl mx-auto pt-8">
        {features.map(({ icon, title, description }) => (
          <Card key={title} className="shadow-2xl border border-gray-50/50 hover:-translate-y-2 transition-transform duration-300 bg-white p-2">
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
              <div className="bg-green-100/70 p-3 rounded-xl">
                {icon}
              </div>
              <div className="flex flex-col text-left">
                <CardTitle className="text-lg font-bold">{title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-lg text-gray-600 leading-relaxed text-left pb-4">
              {description}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
