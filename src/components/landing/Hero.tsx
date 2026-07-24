import { Link } from "react-router-dom";
import { Button } from "@/components/landing/ui/button";
import { Badge } from "@/components/landing/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/landing/ui/card";
import { Check, LayoutDashboard, DollarSign, Share2 } from "lucide-react";

interface HeroProps {
  isLoggedIn?: boolean;
}

export const Hero = ({ isLoggedIn = false }: HeroProps) => {
  const ctaHref = isLoggedIn ? "/dashboard" : "/login";
  const ctaLabel = isLoggedIn ? "Go to Dashboard" : "Start designing free";

  return (
    <section className="w-full flex flex-col items-center text-center pt-8 pb-24 gap-16 px-4">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-12 w-full max-w-7xl mx-auto z-10 relative">
        {/* Left: Text block */}
        <div className="max-w-2xl space-y-6 flex flex-col items-start text-left lg:w-[55%]">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-[#333] leading-tight hover:text-[#1bc650] transition-colors duration-300 cursor-default">
            Draft your perfect layout!
          </h1>
          
          <p className="text-xl text-gray-600 leading-relaxed">
            Your space matters. Planning and designing it can be challenging, which is why FloorPlan Pro exists. We believe that planning your space shouldn't be difficult, expensive, or exclusive to professionals. 
            It should be easy, accessible, fun, and free for everyone.
          </p>

          <p className="text-xl text-gray-600 leading-relaxed">
            Easily draw professional 2D floor plans and instantly track your project's furnishing costs in real-time with our built-in budget estimator.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-6 w-full">
            <Link
              to={ctaHref}
              className="px-8 py-4 rounded bg-[#1de25b] text-black font-bold text-lg hover:bg-[#1bc650] transition-colors shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]"
            >
              Get Started for Free
            </Link>
          </div>
        </div>

        {/* Right: Images */}
        <div className="w-full lg:w-[45%] relative h-[400px] lg:h-[550px] flex items-center justify-center mt-12 lg:mt-0">
          <img 
            src="/hero-render.png?v=2" 
            alt="3D Room Render"
            className="absolute top-4 lg:top-12 right-0 w-[85%] rounded-md shadow-2xl border-4 border-white rotate-2 z-10" 
          />
          <img 
            src="/hero-app-ui.png?v=2" 
            alt="FloorPlan Pro Interface"
            className="absolute bottom-4 lg:bottom-12 left-0 w-[70%] rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-[8px] border-white -rotate-3 z-20" 
          />
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div id="overview" className="w-full max-w-7xl mx-auto flex flex-col items-center relative z-10 pt-28 pb-8">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#333] mb-12 hover:text-[#1bc650] transition-colors duration-300 cursor-default">Overview</h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 w-full">
          {/* Room stats card */}
          <Card className="shadow-2xl border border-gray-50/50 hover:-translate-y-2 transition-transform duration-300 bg-white p-2">
          <CardHeader className="flex flex-row items-center gap-4 pb-4">
            <div className="bg-green-100/70 p-3 rounded-xl">
              <LayoutDashboard className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex flex-col text-left">
              <CardTitle className="text-lg font-bold">Living Room Layout</CardTitle>
              <CardDescription className="font-medium text-gray-500 mt-1">3 rooms · 12 items placed</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-base text-gray-600 leading-relaxed text-left pb-4">
            Drag-and-drop furniture on a scale canvas. Snap to grid, rotate, check collisions automatically.
          </CardContent>
        </Card>

        {/* Budget card */}
        <Card className="shadow-2xl border border-gray-50/50 hover:-translate-y-2 transition-transform duration-300 bg-white p-2">
          <CardHeader className="pb-4 text-left">
            <CardTitle className="flex items-center justify-between text-[17px] font-bold">
              Live Budget
              <Badge variant="secondary" className="text-green-700 bg-green-100/80 hover:bg-green-100 border-none px-3 py-1 text-xs">Auto-updated</Badge>
            </CardTitle>
            <div className="pt-2">
              <span className="text-4xl font-extrabold tracking-tight">$2,640</span>
              <span className="text-gray-500 font-medium ml-1">total</span>
            </div>
          </CardHeader>
          <CardContent className="text-base space-y-3 pt-2 pb-4">
            {[
              { label: "Beds & Sofas", amount: "$1,200" },
              { label: "Tables & Desks", amount: "$850" },
              { label: "Storage", amount: "$590" },
            ].map(({ label, amount }) => (
              <div key={label} className="flex justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                <span className="text-gray-500 font-medium">{label}</span>
                <span className="font-bold text-gray-800">{amount}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Share card */}
        <Card className="shadow-2xl border border-gray-50/50 hover:-translate-y-2 transition-transform duration-300 bg-white p-2">
          <CardHeader className="pb-4 text-left">
            <CardTitle className="flex items-center gap-2 text-[17px] font-bold">
              <Share2 className="w-5 h-5 text-green-600" />
              Share with client
            </CardTitle>
            <CardDescription className="text-gray-500 font-medium mt-1">Read-only link, no login needed</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="w-full py-3 bg-gray-50/80 text-center rounded-lg font-semibold text-sm cursor-pointer hover:bg-gray-100 transition-colors mb-5 border border-gray-100">
              Copy share link
            </div>
            <div className="flex flex-col items-start gap-3">
              {["Scale-accurate floor plan", "Live budget breakdown", "Export PNG / PDF"].map((b) => (
                <span key={b} className="flex items-center gap-3 text-base font-medium text-gray-600">
                  <Check className="text-green-500 w-5 h-5 shrink-0 stroke-[3]" />
                  <span>{b}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export card */}
        <Card className="shadow-2xl border border-gray-50/50 hover:-translate-y-2 transition-transform duration-300 bg-white p-2">
          <CardHeader className="space-y-4 flex flex-col justify-start items-start text-left pb-4">
            <div className="bg-green-100/70 p-3 rounded-xl mt-2">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="pt-2">
              <CardTitle className="text-lg font-bold">Branded PDF export</CardTitle>
              <CardDescription className="text-base text-gray-600 font-medium mt-3 leading-relaxed">
                One-click export with your project name, room breakdown, and full budget summary — ready to send to clients.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
        </div>
      </div>
    </section>
  );
};
