import React from "react";
import WalletManager from '../wallet/WalletManager';

export default function Navbar() {
  return (
    <>
      {/* Navbar */}
      <nav className="md:flex-row md:flex-nowrap md:justify-start flex items-center px-4 py-2 border bg-gray-700 border-gray-500">
        <div className="w-full mx-auto items-center flex justify-between md:flex-nowrap flex-wrap md:px-10 px-4">
          {/* Brand */}
          <div className="w-full flex items-center justify-between">
            <div className="flex justify-between">
              <a
                className="text-white text-sm hidden lg:inline-block font-semibold"
                href="#"
                onClick={(e) => e.preventDefault()}
              >
                KaLender DeFi
              </a>
            </div>
            <WalletManager />
          </div>
        </div>
      </nav>
      {/* End Navbar */}
    </>
  );
}
