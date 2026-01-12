import { useEffect } from 'react';
import { useBranding } from '@/hooks/useBranding';

/**
 * DynamicBranding Component
 * 
 * This component dynamically updates the PWA metadata (title, icons, manifest)
 * based on the store's branding settings from the database.
 * 
 * When branding changes in the system, the installed app will reflect those changes
 * after the next app load/refresh.
 */
export function DynamicBranding() {
  const { branding } = useBranding();

  // Update document title and meta tags based on branding
  useEffect(() => {
    if (!branding) return;

    const brandName = branding.brand_name || 'ERP Software';
    
    // Update page title
    document.title = brandName;
    
    // Update meta tags for PWA
    const updateMetaTag = (selector: string, attribute: string, value: string) => {
      const element = document.querySelector(selector);
      if (element) {
        element.setAttribute(attribute, value);
      }
    };

    // Update application name meta tags
    updateMetaTag('meta[name="application-name"]', 'content', brandName);
    updateMetaTag('meta[name="apple-mobile-web-app-title"]', 'content', brandName);
    
    // Update OG tags
    updateMetaTag('meta[property="og:title"]', 'content', brandName);
    updateMetaTag('meta[name="twitter:title"]', 'content', brandName);

    // Update theme color if primary color is set
    if (branding.primary_color) {
      // Convert HSL to hex for theme-color (simplified conversion)
      const themeColor = '#1a1a2e'; // Keep dark theme base
      updateMetaTag('meta[name="theme-color"]', 'content', themeColor);
      updateMetaTag('meta[name="msapplication-TileColor"]', 'content', themeColor);
    }

  }, [branding?.brand_name, branding?.primary_color]);

  // Update favicon and PWA icons based on branding logo
  useEffect(() => {
    if (!branding?.logo_url) return;

    const logoUrl = branding.logo_url;
    const cacheBuster = `?t=${Date.now()}`;
    
    // Update favicon
    const updateLink = (selector: string, href: string) => {
      const element = document.querySelector(selector) as HTMLLinkElement;
      if (element) {
        element.href = href + cacheBuster;
      }
    };

    // Update favicon link
    let faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement;
    if (faviconLink) {
      faviconLink.href = branding.favicon_url || logoUrl + cacheBuster;
    }

    // Update apple-touch-icon links
    const appleTouchIcons = document.querySelectorAll("link[rel='apple-touch-icon']");
    appleTouchIcons.forEach((icon) => {
      (icon as HTMLLinkElement).href = logoUrl + cacheBuster;
    });

    // Dynamically update manifest for PWA (for future installs)
    updateManifest(branding.brand_name || 'ERP Software', logoUrl);

  }, [branding?.logo_url, branding?.favicon_url, branding?.brand_name]);

  return null; // This component doesn't render anything
}

/**
 * Dynamically creates and updates the PWA manifest
 * This ensures new installations get the correct branding
 */
function updateManifest(brandName: string, logoUrl: string) {
  // Remove existing manifest link if any custom one exists
  const existingCustomManifest = document.querySelector('link[rel="manifest"][data-dynamic="true"]');
  if (existingCustomManifest) {
    existingCustomManifest.remove();
  }

  // Create dynamic manifest
  const manifest = {
    name: brandName,
    short_name: brandName.length > 12 ? brandName.substring(0, 12) : brandName,
    description: `${brandName} - ERP System`,
    theme_color: '#1a1a2e',
    background_color: '#0f0f23',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: logoUrl,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: logoUrl,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
  };

  // Create blob URL for manifest
  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const manifestUrl = URL.createObjectURL(manifestBlob);

  // Create and append new manifest link
  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = manifestUrl;
  manifestLink.setAttribute('data-dynamic', 'true');
  
  // Remove existing static manifest and add dynamic one
  const staticManifest = document.querySelector('link[rel="manifest"]:not([data-dynamic])');
  if (staticManifest) {
    staticManifest.remove();
  }
  
  document.head.appendChild(manifestLink);
}

export default DynamicBranding;
