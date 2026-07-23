import logoStemUrl from "../../../public/site-template/assets/logo-olimpiadas-stem.png";

export const INSTITUTION_LOGOS = {
  stem: logoStemUrl,
};

export function InstitutionLogos({ className = "" }) {
  return (
    <div className={`institution-logos ${className}`.trim()}>
      <img
        src={INSTITUTION_LOGOS.stem}
        alt="Olimpiadas STEM"
        className="institution-logos__img institution-logos__img--stem"
      />
    </div>
  );
}

export function SiteBrandHeader({ className = "" }) {
  return (
    <header className={`site-header ${className}`.trim()}>
      <div className="site-header__bar">
        <div className="site-header__titles">
          <div className="site-header__brand">SPEED</div>
          <p className="site-header__tagline">
            Robótica educativa para docentes usando metodologías ABP.
          </p>
        </div>
        <InstitutionLogos className="site-header__logos" />
      </div>
    </header>
  );
}
