let _otp = '';
let _phone = '';
let _resendInterval = null;

// ── Send OTP ──────────────────────────────────────────────────────────────────
function sendOTP() {
  const cc    = document.getElementById('country-code').value;
  const num   = document.getElementById('phone').value.trim();
  const errEl = document.getElementById('phone-error');

  if (!/^\d{7,15}$/.test(num)) {
    errEl.textContent = 'Enter a valid mobile number';
    return;
  }
  errEl.textContent = '';
  _phone = cc + num;

  // Generate 6-digit OTP
  _otp = String(Math.floor(100000 + Math.random() * 900000));
  console.log(`%c OTP for ${_phone}: ${_otp} `, 'background:#00ff88;color:#000;font-size:16px;padding:4px 8px;border-radius:4px;');

  // In production: call your SMS API here (Twilio, MSG91, etc.)
  // fetch('/api/send-otp', { method:'POST', body: JSON.stringify({phone:_phone, otp:_otp}) })

  document.getElementById('otp-sent-to').textContent = `OTP sent to ${_phone}`;
  document.getElementById('step-phone').classList.add('hidden');
  document.getElementById('step-otp').classList.remove('hidden');

  // focus first box
  document.querySelectorAll('.otp-box')[0].focus();
  startResendTimer(30);
}

// ── OTP box keyboard nav ──────────────────────────────────────────────────────
document.querySelectorAll('.otp-box').forEach((box, i, boxes) => {
  box.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(-1);
    if (this.value) {
      this.classList.add('filled');
      if (i < boxes.length - 1) boxes[i + 1].focus();
      else verifyOTP(); // auto-verify on last digit
    } else {
      this.classList.remove('filled');
    }
  });

  box.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' && !this.value && i > 0) {
      boxes[i - 1].value = '';
      boxes[i - 1].classList.remove('filled');
      boxes[i - 1].focus();
    }
  });

  box.addEventListener('paste', function (e) {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
    [...pasted].forEach((ch, j) => {
      if (boxes[j]) { boxes[j].value = ch; boxes[j].classList.add('filled'); }
    });
    if (pasted.length === 6) verifyOTP();
  });
});

// ── Verify OTP ────────────────────────────────────────────────────────────────
function verifyOTP() {
  const entered = [...document.querySelectorAll('.otp-box')].map(b => b.value).join('');
  const errEl   = document.getElementById('otp-error');

  if (entered.length < 6) {
    errEl.textContent = 'Enter all 6 digits';
    return;
  }

  if (entered === _otp) {
    errEl.textContent = '';
    // Save session
    sessionStorage.setItem('sw_user', _phone);
    window.location.href = 'index.html';
  } else {
    errEl.textContent = 'Incorrect OTP. Try again.';
    document.querySelectorAll('.otp-box').forEach(b => {
      b.value = '';
      b.classList.remove('filled');
      b.style.borderColor = '#ff4444';
      setTimeout(() => b.style.borderColor = '', 800);
    });
    document.querySelectorAll('.otp-box')[0].focus();
  }
}

// ── Resend ────────────────────────────────────────────────────────────────────
function resendOTP() {
  if (document.getElementById('resend-timer').textContent) return;
  _otp = String(Math.floor(100000 + Math.random() * 900000));
  console.log(`%c New OTP for ${_phone}: ${_otp} `, 'background:#00ff88;color:#000;font-size:16px;padding:4px 8px;border-radius:4px;');
  document.getElementById('otp-error').textContent = '';
  document.querySelectorAll('.otp-box').forEach(b => { b.value = ''; b.classList.remove('filled'); });
  document.querySelectorAll('.otp-box')[0].focus();
  startResendTimer(30);
}

function startResendTimer(sec) {
  clearInterval(_resendInterval);
  const el = document.getElementById('resend-timer');
  el.textContent = `(${sec}s)`;
  _resendInterval = setInterval(() => {
    sec--;
    if (sec <= 0) { clearInterval(_resendInterval); el.textContent = ''; }
    else el.textContent = `(${sec}s)`;
  }, 1000);
}

// ── Back ──────────────────────────────────────────────────────────────────────
function backToPhone() {
  clearInterval(_resendInterval);
  document.getElementById('step-otp').classList.add('hidden');
  document.getElementById('step-phone').classList.remove('hidden');
  document.querySelectorAll('.otp-box').forEach(b => { b.value = ''; b.classList.remove('filled'); });
  document.getElementById('otp-error').textContent = '';
}
