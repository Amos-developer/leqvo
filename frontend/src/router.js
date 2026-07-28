import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "./views/HomeView.vue";
import LoginView from "./views/LoginView.vue";
import RegisterView from "./views/RegisterView.vue";
import ForgotPasswordView from "./views/ForgotPasswordView.vue";

const routes = [
  { path: "/", name: "home", component: HomeView, meta: { requiresAuth: true } },
  { path: "/login", name: "login", component: LoginView },
  { path: "/register", name: "register", component: RegisterView },
  { path: "/forgot-password", name: "forgot-password", component: ForgotPasswordView }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach((to) => {
  const savedUser = localStorage.getItem("leqvoUser");

  if (to.meta.requiresAuth && !savedUser) {
    return "/login";
  }

  if ((to.name === "login" || to.name === "register") && savedUser) {
    return "/";
  }

  return true;
});

export default router;
