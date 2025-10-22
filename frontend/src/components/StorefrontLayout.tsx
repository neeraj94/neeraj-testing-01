import { Outlet } from 'react-router-dom';
import StorefrontFooter from './StorefrontFooter';
import StorefrontHeader from './StorefrontHeader';

const StorefrontLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <StorefrontHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <StorefrontFooter />
    </div>
  );
};

export default StorefrontLayout;
