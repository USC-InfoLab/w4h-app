<template>
  <div class="container">
    <img class="mt-5" style="width: 230px" src="/w4h.svg" alt="W4H Toolkit logo" />
    <div class="logotype mb-4">W4H Toolkit</div>
    <div class="row justify-content-center">
      <div class="col-lg-3">
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">Login with Email Code</h5>
            <div v-if="!emailSent">
              <p>Please enter your email address to receive a verification code:</p>
              <form @submit.prevent="sendCode">
                <div class="mb-3">
                  <label for="email" class="form-label">Email</label>
                  <input type="email" id="email" v-model="email" class="form-control" required>
                </div>
                <div class="mb-3">
                  <button type="submit" class="btn btn-primary">Send Code</button>
                </div>
              </form>
            </div>
            <div v-else>
              <p>An email with a verification code has been sent to {{ email }}. Please enter the code to proceed:</p>
              <form @submit.prevent="login">
                <div class="mb-3">
                  <label for="code" class="form-label">Verification Code</label>
                  <input type="text" id="code" v-model="code" class="form-control" required>
                </div>
                <div class="mb-3">
                  <button type="submit" class="btn btn-primary">Login</button>
                </div>
                <p class="mt-2 fw-bold text-danger">{{ message }}</p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    <p id="footer" class="text-muted">{{ copyright }}</p>

  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api } from '../utils/api';
import { useRouter } from 'vue-router';
const router = useRouter();

import { useUserStore } from '../stores/user';
const userStore = useUserStore();

const email = ref('');
const code = ref('');
const emailSent = ref(false);
const message = ref('');
const copyright = import.meta.env.VITE_COPYRIGHT;

const sendCode = async () => {
  try {
    await api.get('users/send-code', { params: { email: email.value } });
    emailSent.value = true;
  } catch (error) {
    message.value = 'Failed to send code:' + error;
  }
};

const login = async () => {
  try {
    const response = await api.get('users/verify-code', { params: { code: code.value } });
    if (response.data.error) {
      message.value = response.data.error.message;
    } else {
      const { user, token } = response.data;
      localStorage.setItem('w4h.user.token', token);
      await userStore.setUser(user);
      router.push('/home');
    }
  } catch (error) {
    message.value = 'Login failed:' + error;
  }
};
</script>

<style scoped>
body {
  min-height: 50vh;
}

#footer {
  position: fixed;
  height: 50px;
  bottom: 0px;
  left: 0px;
  right: 0px;
  margin-bottom: 0px;
}

.form-signin {
  width: 100%;
  max-width: 330px;
  padding: 0px 15px;
  margin: 0 auto;
}

.form-signin .checkbox {
  font-weight: 400;
}

.form-signin .form-control {
  position: relative;
  box-sizing: border-box;
  height: auto;
  padding: 10px;
  font-size: 16px;
}

.form-signin h1 {
  font-size: 6em;
}

.form-signin .form-control:focus {
  z-index: 2;
}

.form-signin input[type='email'] {
  margin-bottom: -1px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.form-signin input[type='password'] {
  margin-bottom: 10px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.logotype {
  margin: 20px 0;
  font-size: 1.5em;
  font-weight: bolder;
}

#inputEmail {
  border-bottom-left-radius: 0px !important;
  border-bottom-right-radius: 0px !important;
}
</style>
