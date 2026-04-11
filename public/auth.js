(function () {
  var USERS_KEY = 'cursos_alj_users_v1';
  var SESSION_KEY = 'cursos_alj_session_v1';

  function nowMs() {
    return Date.now();
  }

  function normalizeUsername(username) {
    return String(username || '').trim().toLowerCase();
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function readUsers() {
    try {
      var raw = localStorage.getItem(USERS_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function writeUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function readSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function daysToMs(days) {
    return Number(days) * 24 * 60 * 60 * 1000;
  }

  function bootstrapAdmin() {
    var users = readUsers();
    var adminUsername = 'Antonio Junior';
    var adminEmail = 'admin@aljcursos.com.br';
    var adminNorm = normalizeUsername(adminUsername);

    var adminUser = users.find(function (u) {
      return u.role === 'admin' && u.usernameNorm === adminNorm;
    });

    if (adminUser) {
      if (!adminUser.emailNorm) {
        adminUser.email = adminEmail;
        adminUser.emailNorm = normalizeEmail(adminEmail);
        writeUsers(users);
      }
      return;
    }

    users.push({
      id: 'u_admin_1',
      username: adminUsername,
      usernameNorm: adminNorm,
      email: adminEmail,
      emailNorm: normalizeEmail(adminEmail),
      password: 'Cursosalj@123',
      role: 'admin',
      createdAt: nowMs(),
      accessExpiresAt: null
    });

    writeUsers(users);
  }

  function bootstrapRecoveryAdmin() {
    var users = readUsers();
    var recoveryEmail = 'a_limajunior@hotmail.com';
    var recoveryEmailNorm = normalizeEmail(recoveryEmail);
    var recoveryUsername = 'Antonio Lima Junior';
    var recoveryUsernameNorm = normalizeUsername(recoveryUsername);
    var recoveryPassword = 'Aljcursos@123';

    var existingByEmail = users.find(function (u) {
      return u.emailNorm === recoveryEmailNorm;
    });

    if (existingByEmail) {
      existingByEmail.username = existingByEmail.username || recoveryUsername;
      existingByEmail.usernameNorm = normalizeUsername(existingByEmail.username);
      existingByEmail.password = recoveryPassword;
      existingByEmail.role = 'admin';
      existingByEmail.accessExpiresAt = null;
      writeUsers(users);
      return;
    }

    users.push({
      id: 'u_admin_recovery_1',
      username: recoveryUsername,
      usernameNorm: recoveryUsernameNorm,
      email: recoveryEmail,
      emailNorm: recoveryEmailNorm,
      password: recoveryPassword,
      role: 'admin',
      createdAt: nowMs(),
      accessExpiresAt: null
    });

    writeUsers(users);
  }

  function getUserByNorm(normUsername) {
    var users = readUsers();
    return users.find(function (u) { return u.usernameNorm === normUsername; }) || null;
  }

  function getUserByEmailNorm(normEmail) {
    var users = readUsers();
    return users.find(function (u) { return u.emailNorm === normEmail; }) || null;
  }

  function isExpired(user) {
    if (!user || user.accessExpiresAt == null) return false;
    return nowMs() > Number(user.accessExpiresAt);
  }

  function getCurrentUser() {
    var session = readSession();
    if (!session || !session.usernameNorm) return null;

    if (session.sessionExpiresAt && nowMs() > Number(session.sessionExpiresAt)) {
      clearSession();
      return null;
    }

    var user = getUserByNorm(session.usernameNorm);
    if (!user) {
      clearSession();
      return null;
    }

    if (isExpired(user)) {
      clearSession();
      return null;
    }

    return user;
  }

  function login(email, password) {
    var emailNorm = normalizeEmail(email);
    var user = getUserByEmailNorm(emailNorm);

    if (!user || String(user.password) !== String(password)) {
      return { ok: false, message: 'E-mail ou senha inválidos.' };
    }

    if (isExpired(user)) {
      return { ok: false, message: 'Acesso expirado. Fale com o administrador.' };
    }

    var maxSessionMs = 8 * 60 * 60 * 1000; // 8h
    var sessionExpiresAt = nowMs() + maxSessionMs;

    if (user.accessExpiresAt != null) {
      sessionExpiresAt = Math.min(sessionExpiresAt, Number(user.accessExpiresAt));
    }

    writeSession({
      usernameNorm: user.usernameNorm,
      sessionExpiresAt: sessionExpiresAt
    });

    return { ok: true, user: user };
  }

  function logout() {
    clearSession();
  }

  function requireAuth(opts) {
    var options = opts || {};
    var adminOnly = !!options.adminOnly;
    var redirectTo = options.redirectTo || 'login.html';

    var user = getCurrentUser();
    if (!user) {
      var returnUrl = encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search);
      var fromUrl = 'index-ifrs-19.html';
      try {
        if (document.referrer) {
          var ref = new URL(document.referrer);
          if (ref.origin === window.location.origin) {
            var candidate = ref.pathname.split('/').pop() + ref.search;
            if (candidate && !/login\.html/i.test(candidate)) {
              fromUrl = candidate;
            }
          }
        }
      } catch (e) {}

      window.location.href = redirectTo + '?returnUrl=' + returnUrl + '&fromUrl=' + encodeURIComponent(fromUrl);
      return null;
    }

    if (adminOnly && user.role !== 'admin') {
      window.location.href = 'index-ifrs-19.html';
      return null;
    }

    return user;
  }

  function hasCourseAccess(user, courseId) {
    if (!user || !courseId) return false;
    if (user.role === 'admin') return true;
    var allowedCourses = Array.isArray(user.courses) ? user.courses : [];
    return allowedCourses.indexOf(courseId) !== -1;
  }

  function requireCourseAccess(courseId, opts) {
    var options = opts || {};
    var user = requireAuth(options);
    if (!user) return null;

    if (hasCourseAccess(user, courseId)) {
      return user;
    }

    var fallbackUrl = options.fallbackUrl || 'home.html';
    if (options.showDeniedAlert !== false) {
      alert('Seu usuario nao possui acesso a este curso.');
    }
    window.location.href = fallbackUrl;
    return null;
  }

  function createUser(payload) {
    var username = String(payload.username || '').trim();
    var email = String(payload.email || '').trim();
    var password = String(payload.password || '').trim();
    var role = payload.role === 'admin' ? 'admin' : 'aluno';
    var accessDays = Number(payload.accessDays);

    if (!username) return { ok: false, message: 'Informe o nome de usuário.' };
    if (!email) return { ok: false, message: 'Informe o e-mail.' };
    if (!password) return { ok: false, message: 'Informe a senha.' };
    if (!Number.isFinite(accessDays) || accessDays <= 0) return { ok: false, message: 'Informe dias de acesso válidos.' };

    var usernameNorm = normalizeUsername(username);
    var emailNorm = normalizeEmail(email);
    var users = readUsers();

    var exists = users.some(function (u) { return u.usernameNorm === usernameNorm; });
    if (exists) return { ok: false, message: 'Usuário já existe.' };

    var emailExists = users.some(function (u) { return u.emailNorm === emailNorm; });
    if (emailExists) return { ok: false, message: 'E-mail já cadastrado.' };

    var expiresAt = nowMs() + daysToMs(accessDays);

    users.push({
      id: 'u_' + nowMs() + '_' + Math.floor(Math.random() * 10000),
      username: username,
      usernameNorm: usernameNorm,
      email: email,
      emailNorm: emailNorm,
      password: password,
      role: role,
      createdAt: nowMs(),
      accessExpiresAt: expiresAt
    });

    writeUsers(users);
    return { ok: true };
  }

  function listUsers() {
    return readUsers().slice().sort(function (a, b) {
      return String(a.username).localeCompare(String(b.username), 'pt-BR');
    });
  }

  function removeUser(usernameNorm) {
    var users = readUsers();
    var current = getCurrentUser();

    var target = users.find(function (u) { return u.usernameNorm === usernameNorm; });
    if (!target) return { ok: false, message: 'Usuário não encontrado.' };
    if (target.role === 'admin' && target.usernameNorm === normalizeUsername('Antonio Junior')) {
      return { ok: false, message: 'Não é permitido remover o administrador principal.' };
    }
    if (current && current.usernameNorm === usernameNorm) {
      return { ok: false, message: 'Você não pode remover seu próprio usuário em sessão.' };
    }

    users = users.filter(function (u) { return u.usernameNorm !== usernameNorm; });
    writeUsers(users);
    return { ok: true };
  }

  function formatDateTime(ts) {
    if (!ts) return '-';
    try {
      return new Date(ts).toLocaleString('pt-BR');
    } catch (e) {
      return '-';
    }
  }

  bootstrapAdmin();
  bootstrapRecoveryAdmin();

  window.CourseAuth = {
    login: login,
    logout: logout,
    requireAuth: requireAuth,
    requireCourseAccess: requireCourseAccess,
    hasCourseAccess: hasCourseAccess,
    getCurrentUser: getCurrentUser,
    createUser: createUser,
    listUsers: listUsers,
    removeUser: removeUser,
    isExpired: isExpired,
    formatDateTime: formatDateTime,
    normalizeUsername: normalizeUsername,
    normalizeEmail: normalizeEmail
  };
})();
