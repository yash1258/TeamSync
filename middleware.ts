import {
    convexAuthNextjsMiddleware,
    createRouteMatcher,
    nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { featureFlags } from "@/lib/featureFlags";

const isLoginPage = createRouteMatcher(["/login"]);
const isPlanningRoute = createRouteMatcher([
    "/planning(.*)",
    "/projects(.*)",
    "/roadmap(.*)",
    "/decisions(.*)",
]);
const isProtectedRoute = createRouteMatcher([
    "/",
    "/planning(.*)",
    "/projects(.*)",
    "/roadmap(.*)",
    "/decisions(.*)",
    "/tasks(.*)",
    "/budget(.*)",
    "/team(.*)",
    "/calendar(.*)",
    "/docs(.*)",
    "/profile(.*)",
    "/settings(.*)",
]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
    if (isPlanningRoute(request) && !featureFlags.planningHub) {
        return nextjsMiddlewareRedirect(request, "/");
    }

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
