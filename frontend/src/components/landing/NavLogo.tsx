/** The "Hustle Village" wordmark with the branded dot on the i. */
export const NavLogo = () => (
  <span className="flex items-baseline select-none leading-none">
    <span className="text-xl sm:text-2xl font-bold" style={{ color: '#124919' }}>
      Hustle&nbsp;
    </span>
    <span className="text-xl sm:text-2xl font-bold" style={{ color: '#E57E00' }}>
      V
    </span>
    {/* dotless-i (ı) + oversized branded dot */}
    <span className="relative text-xl sm:text-2xl font-bold" style={{ color: '#E57E00' }}>
      i
      <span
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{ width: 6, height: 6, background: '#E57E00', top: 1 }}
      />
    </span>
    <span className="text-xl sm:text-2xl font-bold" style={{ color: '#E57E00' }}>
      llage
    </span>
  </span>
);
