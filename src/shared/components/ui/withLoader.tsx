import { Suspense } from 'react';
import { UniversalLoader } from '@/shared/components/ui/UniversalLoader';

export function withLoader<T extends JSX.IntrinsicAttributes>(Component: React.ComponentType<T>) {
  return function LoaderWrapper(props: T) {
    return (
      <Suspense fallback={<UniversalLoader message="Chargement..." />}> 
        <Component {...props} />
      </Suspense>
    );
  };
}
