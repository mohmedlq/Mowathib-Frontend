
import { useEffect, useState } from 'react';
import { schoolDataService } from '../../services/schoolDataService';
import { cn } from '../../utils/cn';

export interface RepresentativeBadgeProps {
  representativeId?: number;
  enrollmentId?: number;
  role?: string;
  className?: string;
  showDot?: boolean;
}

type BadgeRole = 'عريف' | 'نائب' | 'طالب';

// Cache resolved roles by target ID
const roleCache = new Map<number, BadgeRole>();

function mapRawRole(raw: string | undefined | null): BadgeRole {
  const normalized = raw?.trim().toLowerCase();

  if (normalized === 'deputy' || normalized === 'نائب') {
    return 'نائب';
  }

  if (normalized === 'representative' || normalized === 'عريف') {
    return 'عريف';
  }

  // Any other role or missing value is a regular student
  return 'طالب';
}

export function RepresentativeBadge({
  representativeId,
  enrollmentId,
  role: directRole,
  className,
  showDot = true,
}: RepresentativeBadgeProps) {
  const targetId = representativeId ?? enrollmentId ?? 0;

  // Only prioritize the direct role if it was actually provided
  const hasDirectRole =
    typeof directRole === 'string' && directRole.trim().length > 0;

  const mappedDirectRole = hasDirectRole
    ? mapRawRole(directRole)
    : null;

  const [resolvedRole, setResolvedRole] = useState<BadgeRole>(() => {
    if (mappedDirectRole) return mappedDirectRole;

    if (targetId && roleCache.has(targetId)) {
      return roleCache.get(targetId)!;
    }

    return 'طالب';
  });

  useEffect(() => {
    // 1. Use directly provided role
    if (mappedDirectRole) {
      setResolvedRole(mappedDirectRole);
      return;
    }

    // 2. No target ID means regular student
    if (!targetId) {
      setResolvedRole('طالب');
      return;
    }

    // 3. Use cached role if available
    const cachedRole = roleCache.get(targetId);

    if (cachedRole) {
      setResolvedRole(cachedRole);
      return;
    }

    let isMounted = true;

    // Default to student while resolving the actual role
    setResolvedRole('طالب');

    const fetchRole = async () => {
      try {
        const rawRole =
          await schoolDataService.getRepresentativeRoleById(targetId);

        const mappedRole = mapRawRole(rawRole);

        roleCache.set(targetId, mappedRole);

        if (isMounted) {
          setResolvedRole(mappedRole);
        }
      } catch (error) {
        console.error('Failed to resolve representative role:', error);

        // Never assume a student is a representative when the API fails
        if (isMounted) {
          setResolvedRole('طالب');
        }
      }
    };

    void fetchRole();

    return () => {
      isMounted = false;
    };
  }, [targetId, mappedDirectRole]);

  const isDeputy = resolvedRole === 'نائب';
  const isRepresentative = resolvedRole === 'عريف';

  const badgeStyles = isDeputy
    ? 'bg-[#EEF2F6] text-[#2C4A6F] border-[#2C4A6F]/20'
    : isRepresentative
      ? 'bg-[#E8F1F1] text-[#245B63] border-[#245B63]/25'
      : 'bg-gray-100 text-gray-600 border-gray-300/60';

  const dotStyles = isDeputy
    ? 'bg-[#2C4A6F]'
    : isRepresentative
      ? 'bg-[#245B63]'
      : 'bg-gray-400';

  const title = isDeputy
    ? 'نائب عريف الصف المعتمد'
    : isRepresentative
      ? 'عريف الصف الأساسي المعتمد'
      : 'طالب';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 transition-all select-none',
        badgeStyles,
        className
      )}
      title={title}
    >
      {showDot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            dotStyles
          )}
        />
      )}

      <span>{resolvedRole}</span>
    </span>
  );
}

export default RepresentativeBadge;
