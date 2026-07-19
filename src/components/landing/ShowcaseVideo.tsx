export const ShowcaseVideo = () => {
  return (
    <section className="w-full flex flex-col items-center py-24 sm:py-32 px-4">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        
        {/* Text Content */}
        <div className="flex flex-col gap-6 text-left">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#333] leading-[1.15] hover:text-[#1bc650] transition-colors duration-300 cursor-default">
            Create a floor plan from scratch or upload an existing one
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed mt-2">
            Design your ideal layout from scratch, or use our advanced tools to get your floor plan recognized in minutes! Create a fully customizable floor plan—whether it's a simple room, an entire house or a commercial building.
          </p>
        </div>

        {/* Visual container with stacked card effect */}
        <div className="relative w-full mt-8 lg:mt-0">
          {/* Offset card behind */}
          <div className="absolute top-6 -right-6 w-full h-full bg-white border border-gray-100 rounded-3xl shadow-sm hidden sm:block"></div>
          
          {/* Main image container */}
          <div className="relative z-10 w-full aspect-[4/3] sm:aspect-video bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex items-center justify-center">
            <img 
              src="/living-room.png" 
              alt="Living Room FloorPlan" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

      </div>
    </section>
  );
};
