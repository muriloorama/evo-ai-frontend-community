import logoLight from '@/assets/EVO_CRM.png';
import logoDark from '@/assets/EVO_CRM-dark.png';

interface AppLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Renders the app logo. Picks the dark or light variant automatically based on
 * the active theme (Tailwind's `dark` class on <html>). To swap the logo, just
 * replace one of:
 *   - src/assets/EVO_CRM.png       (light theme)
 *   - src/assets/EVO_CRM-dark.png  (dark theme)
 *
 * Both must be the same dimensions to avoid layout shift between themes.
 *
 * `w-auto object-contain` keeps the source aspect ratio — only `className`
 * controls the bounding box, the image never gets stretched.
 */
export default function AppLogo({ className = 'h-12', alt = 'CRM de Atendimento' }: AppLogoProps) {
  const sizingClasses = `${className} w-auto object-contain`;
  return (
    <>
      <img src={logoLight} alt={alt} className={`${sizingClasses} block dark:hidden`} />
      <img src={logoDark}  alt={alt} className={`${sizingClasses} hidden dark:block`} />
    </>
  );
}
