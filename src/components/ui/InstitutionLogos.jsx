import logoBogotaUrl from "../../../public/site-template/assets/logo-bogota-educacion.png";
import logoUniminutoUrl from "../../../public/site-template/assets/logo-uniminuto.png";
import logoStemUrl from "../../../public/site-template/assets/logo-olimpiadas-stem.png";

export const INSTITUTION_LOGOS = {
  bogota: logoBogotaUrl,
  uniminuto: logoUniminutoUrl,
  stem: logoStemUrl,
};

export function InstitutionLogos({ className = "" }) {
  return (
    <div className={`institution-logos ${className}`.trim()}>
      <img
        src={INSTITUTION_LOGOS.uniminuto}
        alt="Corporación Universitaria UNIMINUTO"
        className="institution-logos__img institution-logos__img--uniminuto"
      />
      <img
        src={INSTITUTION_LOGOS.bogota}
        alt="Secretaría de Educación de Bogotá"
        className="institution-logos__img institution-logos__img--bogota"
      />
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
