import React from "react";
import { Link } from "react-router-dom";

interface LogoProps {
  small?: boolean;
}

const Logo: React.FC<LogoProps> = ({ small = false }) => {
  return (
    <Link
      to=""
      className={`flex items-center justify-center ${small ? "p-0" : "py-2"}`}
    >
      {small ? (
        <img
          src="/small-logo.png"
          alt="VIILARE"
          className="h-8 w-8 object-contain mb-2"
        />
      ) : (
        <img src="/logo.png" alt="VIILARE" className="h-14 w-auto mb-2" />
      )}
    </Link>
  );
};

export default Logo;
