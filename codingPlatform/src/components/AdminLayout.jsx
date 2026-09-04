import { Link, useLocation } from 'react-router-dom';
import BrandHeader from './BrandHeader';

const links = [
  { to: '/admin', label: 'Overview' },
  { to: '/admin/add-student', label: 'Students' },
  { to: '/admin/questions', label: 'Question bank' },
  { to: '/admin/create-test', label: 'Tests' },
  { to: '/admin/grade-theory', label: 'Grading' },
  { to: '/admin/results', label: 'Results' },
];

const AdminLayout = ({ eyebrow = 'ADMIN CONSOLE', title, description, children, wide = false }) => {
  const location = useLocation();

  return (
    <main className="min-h-screen admin-page text-white px-4 py-5 sm:px-8 sm:py-7">
      <BrandHeader title="Assessment Administration" meta="Create, manage, and review every assessment" />
      <div className={`admin-shell ${wide ? 'admin-shell-wide' : ''}`}>
        <nav className="admin-nav" aria-label="Admin navigation">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className={location.pathname === link.to ? 'active' : ''}>
              {link.label}
            </Link>
          ))}
        </nav>
        <header className="page-heading">
          <p>{eyebrow}</p>
          <h1>{title}</h1>
          {description && <span>{description}</span>}
        </header>
        {children}
      </div>
    </main>
  );
};

export default AdminLayout;
