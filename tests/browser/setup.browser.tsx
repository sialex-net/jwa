import { renderHook as renderReactHook } from '@testing-library/react';
import {
	createRoutesStub,
	Outlet,
	type RoutesTestStubProps,
} from 'react-router';
import { afterEach, beforeEach, vi } from 'vitest';
import { render } from 'vitest-browser-react';

export type StubRouteEntry = Parameters<typeof createRoutesStub>[0][0];

const renderStub = async (args?: {
	entries?: StubRouteEntry[];
	props?: RoutesTestStubProps;
}) => {
	const entries: StubRouteEntry[] = [
		{
			Component: () => (
				<div data-testid="root">
					<Outlet />
				</div>
			),
			children: args?.entries ?? [],
			id: 'root',
			path: '/',
		},
	];
	const props: RoutesTestStubProps = {
		...args?.props,
		initialEntries: args?.props?.initialEntries ?? ['/'],
	};
	const Stub = createRoutesStub(entries);
	const renderedScreen = render(<Stub {...props} />);

	return renderedScreen;
};

const renderHook = renderReactHook;

declare module 'vitest' {
	export interface TestContext {
		renderHook: typeof renderHook;
		renderStub: typeof renderStub;
	}
}
beforeEach((ctx) => {
	ctx.renderStub = renderStub;
	ctx.renderHook = renderHook;
});

afterEach(() => {
	vi.clearAllMocks();
});
