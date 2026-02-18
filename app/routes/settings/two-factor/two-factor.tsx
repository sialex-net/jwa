import { Outlet } from 'react-router';
import { Icon } from '@/app/components/ui/icon';
import type { VerificationTypes } from '@/app/routes/auth/verify';

export const handle = {
	breadcrumb: <Icon name="lock-closed">2FA</Icon>,
};

export const twoFAVerificationType = '2fa' satisfies VerificationTypes;

export default function TwoFactorRoute() {
	return <Outlet />;
}
