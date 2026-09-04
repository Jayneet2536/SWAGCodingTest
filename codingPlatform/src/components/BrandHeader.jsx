const brandAsset = (fileName) => `${import.meta.env.BASE_URL}${fileName}`;

const BrandHeader = ({ action }) => (
  <header className="brand-header">
    <img src={brandAsset('swag-dev-club.jpeg')} alt="SWAG Dev's Club" className="brand-logo brand-logo-primary" />
    <div className="brand-spacer" aria-hidden="true" />
    <div className="brand-right">
      {action}
      <img src={brandAsset('gdg.png')} alt="GDG exam partner" className="brand-logo brand-logo-partner" />
    </div>
  </header>
);

export default BrandHeader;
