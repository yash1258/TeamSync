import {
    convexAuthNextjsMiddleware,
    createRouteMatcher,
    nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isLoginPage = createRouteMatcher(["/login"]);
const isProtectedRoute = createRouteMatcher([
    "/",
    "/tasks(.*)",
    "/budget(.*)",
    "/team(.*)",
    "/calendar(.*)",
    "/docs(.*)",
    "/profile(.*)",
    "/settings(.*)",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
    // If user is on login page and already authenticated, redirect to dashboard
    if (isLoginPage(request) && (await convexAuth.isAuthenticated())) {
        return nextjsMiddlewareRedirect(request, "/");
    }

    // If user is trying to access a protected route without being authenticated
    if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
        return nextjsMiddlewareRedirect(request, "/login");
    }
});

export const config = {
    // The following matcher runs middleware on all routes except static assets
    matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
