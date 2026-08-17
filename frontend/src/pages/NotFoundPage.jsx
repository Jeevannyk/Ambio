import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from '@phosphor-icons/react';
import { useAuth } from '../lib/AuthContext';
import './NotFoundPage.css';

function NotFoundPage() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // '/' is behind RequireAuth, so send signed-out visitors straight to /login
  // instead of bouncing them through a redirect.
  const home = user ? '/' : '/login';

  return (
    <div className="notfound-page">
      <span className="notfound-code">404</span>
      <h1 className="notfound-title">Nothing lives here.</h1>
      <p className="notfound-body">
        The page at <code className="notfound-path">{pathname}</code> doesn&rsquo;t exist — it may
        have moved, or the link was mistyped.
      </p>
      <Link className="notfound-action" to={home}>
        <ArrowLeft size={16} />
        <span>{user ? 'Back to your desk' : 'Go to sign in'}</span>
      </Link>
    </div>
  );
}

export default NotFoundPage;
