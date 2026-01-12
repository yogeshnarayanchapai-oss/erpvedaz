import { useEffect } from 'react';
import { useCurrentStore } from '@/contexts/CurrentStoreContext';
import { useStoreBranding } from '@/hooks/useStoreBranding';

/**
 * This component dynamically updates the page title, favicon, and meta tags
 * based on the current store's branding settings.
 */
export function DynamicBranding() {
  const { currentStore } = useCurrentStore();
  const { data: branding } = useStoreBranding(currentStore?.id || '');

  useEffect(() => {
    if (!currentStore) return;

    const storeName = currentStore.name || 'ERP System';

    // Update page title
    document.title = storeName;

    // Update meta tags
    const updateMetaTag = (selector: string, attribute: string, value: string) => {
      const element = document.querySelector(selector);
      if (element) {
        element.setAttribute(attribute, value);
      }
    };

    // Update OG and Twitter meta tags
    updateMetaTag('meta[property="og:title"]', 'content', storeName);
    updateMetaTag('meta[name="twitter:title"]', 'content', storeName);
    updateMetaTag('meta[name="apple-mobile-web-app-title"]', 'content', storeName);
    updateMetaTag('meta[name="application-name"]', 'content', storeName);

    // Update description
    const description = `${storeName} - Manage eCommerce leads, calls, followups and orders`;
    updateMetaTag('meta[name="description"]', 'content', description);
    updateMetaTag('meta[property="og:description"]', 'content', description);
    updateMetaTag('meta[name="twitter:description"]', 'content', description);

  }, [currentStore]);

  useEffect(() => {
    if (!branding) return;

    // Update favicon if available
    if (branding.favicon_url) {
      const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (link) {
        link.href = branding.favicon_url;
      }
    }

    // Update apple touch icons if logo is available
    if (branding.logo_url) {
      const appleTouchIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
      appleTouchIcons.forEach((icon) => {
        (icon as HTMLLinkElement).href = branding.logo_url!;
      });
    }

    // Update theme color if available
    if (branding.primary_color) {
      const themeColorMeta = document.querySelector('meta[name="theme-color"]');
      if (themeColorMeta) {
        themeColorMeta.setAttribute('content', branding.primary_color);
      }
    }

  }, [branding]);

  return null;
}
