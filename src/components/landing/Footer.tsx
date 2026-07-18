import { Link } from "react-router-dom";
import LogoIcon from "../LogoIcon";

export const Footer = () => {
  return (
    <footer id="footer" className="border-t mt-16 w-full flex flex-col items-center">
      <section className="w-full max-w-7xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-8">
        {/* Brand */}
        <div className="col-span-full md:col-span-2">
          <Link to="/" className="font-bold text-xl flex items-center gap-2">
            <LogoIcon className="w-5 h-5 text-green-600" />
            <span>
              FloorPlan <span className="text-green-600">Pro</span>
            </span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs">
            Scale-accurate floor planning for interior designers and real estate
            professionals.
          </p>
        </div>

        {/* Product links */}
        <div className="flex flex-col gap-2">
          <h3 className="font-bold">Product</h3>
          <a href="#features" className="text-sm opacity-60 hover:opacity-100 transition-opacity">
            Features
          </a>
          <a href="#how-it-works" className="text-sm opacity-60 hover:opacity-100 transition-opacity">
            How it works
          </a>
          <Link to="/signup" className="text-sm opacity-60 hover:opacity-100 transition-opacity">
            Get started
          </Link>
        </div>

        {/* Account links */}
        <div className="flex flex-col gap-2">
          <h3 className="font-bold">Account</h3>
          <Link to="/login" className="text-sm opacity-60 hover:opacity-100 transition-opacity">
            Log in
          </Link>
          <Link to="/signup" className="text-sm opacity-60 hover:opacity-100 transition-opacity">
            Sign up
          </Link>
          <Link to="/dashboard" className="text-sm opacity-60 hover:opacity-100 transition-opacity">
            Dashboard
          </Link>
        </div>
      </section>

      <section className="w-full max-w-7xl mx-auto px-4 pb-10 text-center">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} FloorPlan Pro. All rights reserved.
        </p>
      </section>
    </footer>
  );
};
