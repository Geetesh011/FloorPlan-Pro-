import { FURNITURE_CATALOG } from "../../data/furnitureCatalog";

export const FurnitureMarquee = () => {
  // We duplicate the catalog several times to ensure the row is wide enough to cover any screen width.
  // The animation will translate the container by -50%, so the content must be identical in both halves.
  const displayItems = FURNITURE_CATALOG.filter(item => !['toilet', 'sink'].includes(item.id));
  const baseList = [...displayItems, ...displayItems, ...displayItems, ...displayItems];
  const items = [...baseList, ...baseList];

  return (
    <section className="w-full py-20 overflow-hidden bg-white relative z-10">
      <div className="max-w-7xl mx-auto flex flex-col items-center px-4 mb-12">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-black mb-4 text-center hover:text-[#1bc650] transition-colors duration-300 cursor-default">
          A growing furniture catalog
        </h2>
        <p className="text-lg text-muted-foreground text-center">
          {FURNITURE_CATALOG.length}+ pieces to furnish any room
        </p>
      </div>

      <div className="relative w-full flex items-center">
        {/* Gradient fade masks on the edges for smooth entry/exit */}
        <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

        {/* Marquee track container with inline CSS animation classes */}
        <div className="flex items-center w-max animate-marquee hover:play-state-paused py-6">
          {items.map((item, idx) => (
            <div 
              key={`${item.id}-${idx}`} 
              className="group relative flex flex-col items-center justify-center mx-8 md:mx-12 shrink-0 transition-transform duration-300 hover:scale-110 cursor-default"
            >
              <img 
                src={item.thumbnail} 
                alt={item.name} 
                className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-sm transition-opacity duration-300" 
                loading="lazy"
              />
              <span className="absolute -bottom-8 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] md:text-xs font-medium text-gray-500 whitespace-nowrap bg-white/80 px-2.5 py-1 rounded-full backdrop-blur-sm border border-gray-100/50">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
