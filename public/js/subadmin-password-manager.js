// Sub-Admin Password Management Module
// Secure password viewing and editing for main admin

(function() {
  'use strict';

  // Password strength checker
  function checkPasswordStrength(password) {
    let strength = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };

    Object.values(checks).forEach(check => { if (check) strength++; });

    const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['#dc2626', '#f59e0b', '#eab308', '#10b981', '#059669'];
    
    return {
      score: strength,
      level: levels[strength - 1] || 'Very Weak',
      color: colors[strength - 1] || '#dc2626',
      checks
    };
  }

  // Show password change modal
  window.showChangePasswordModal = function(subAdminId, username) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:500px;">
        <div class="modal-header">
          <h2>🔐 Change Password for ${username}</h2>
          <button class="modal-close" onclick="this.closest('.modal').remove()">×</button>
        </div>
        <form id="changePasswordForm" onsubmit="handlePasswordChange(event, '${subAdminId}')">
          <div class="form-group">
            <label>New Password *</label>
            <div style="position:relative;">
              <input type="password" id="newPassword" required 
                     style="width:100%;padding:12px;padding-right:40px;border:2px solid #d1d5db;border-radius:8px;"
                     oninput="updatePasswordStrength(this.value)">
              <button type="button" onclick="togglePasswordVisibility('newPassword')" 
                      style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;font-size:20px;">
                👁️
              </button>
            </div>
            <div id="passwordStrength" style="margin-top:8px;"></div>
          </div>

          <div class="form-group">
            <label>Confirm Password *</label>
            <input type="password" id="confirmPassword" required 
                   style="width:100%;padding:12px;border:2px solid #d1d5db;border-radius:8px;">
          </div>

          <div class="form-group">
            <label>Reason for Change</label>
            <textarea id="changeReason" rows="3" 
                      style="width:100%;padding:12px;border:2px solid #d1d5db;border-radius:8px;"
                      placeholder="Optional: Reason for password change"></textarea>
          </div>

          <div style="background:#fef3c7;border:2px solid #f59e0b;border-radius:8px;padding:12px;margin:16px 0;">
            <div style="display:flex;align-items:center;gap:8px;color:#92400e;">
              <span style="font-size:20px;">⚠️</span>
              <div>
                <strong>Security Notice:</strong>
                <p style="margin:4px 0 0 0;font-size:13px;">This action will be logged for security audit. The sub-admin will be notified of the password change.</p>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-top:20px;">
            <button type="submit" class="btn-primary" style="flex:1;">
              ✅ Change Password
            </button>
            <button type="button" class="btn-secondary" onclick="this.closest('.modal').remove()" style="flex:1;">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
  };

  // Toggle password visibility
  window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.type = input.type === 'password' ? 'text' : 'password';
  };

  // Update password strength indicator
  window.updatePasswordStrength = function(password) {
    const strengthDiv = document.getElementById('passwordStrength');
    if (!strengthDiv) return;

    if (!password) {
      strengthDiv.innerHTML = '';
      return;
    }

    const strength = checkPasswordStrength(password);
    
    strengthDiv.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
          <div style="height:100%;width:${strength.score * 20}%;background:${strength.color};transition:all 0.3s;"></div>
        </div>
        <span style="font-size:12px;font-weight:600;color:${strength.color};">${strength.level}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:11px;">
        <div style="color:${strength.checks.length ? '#10b981' : '#6b7280'};">
          ${strength.checks.length ? '✓' : '○'} 8+ characters
        </div>
        <div style="color:${strength.checks.uppercase ? '#10b981' : '#6b7280'};">
          ${strength.checks.uppercase ? '✓' : '○'} Uppercase
        </div>
        <div style="color:${strength.checks.lowercase ? '#10b981' : '#6b7280'};">
          ${strength.checks.lowercase ? '✓' : '○'} Lowercase
        </div>
        <div style="color:${strength.checks.number ? '#10b981' : '#6b7280'};">
          ${strength.checks.number ? '✓' : '○'} Number
        </div>
        <div style="color:${strength.checks.special ? '#10b981' : '#6b7280'};" style="grid-column:1/-1;">
          ${strength.checks.special ? '✓' : '○'} Special character
        </div>
      </div>
    `;
  };

  // Handle password change submission
  window.handlePasswordChange = async function(event, subAdminId) {
    event.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const reason = document.getElementById('changeReason').value;

    // Validation
    if (newPassword !== confirmPassword) {
      alert('❌ Passwords do not match');
      return;
    }

    const strength = checkPasswordStrength(newPassword);
    if (strength.score < 3) {
      const confirm = window.confirm('⚠️ Password strength is ' + strength.level + '. Continue anyway?');
      if (!confirm) return;
    }

    try {
      const token = localStorage.getItem('sapthala_token') || sessionStorage.getItem('sapthala_token');
      
      const response = await fetch(`/api/admin/sub-admins/${subAdminId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newPassword,
          reason: reason || 'Password changed by main admin'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to change password');
      }

      const data = await response.json();
      
      // Close modal
      document.querySelector('.modal').remove();
      
      // Show success message
      alert('✅ Password changed successfully! The sub-admin has been notified.');
      
      // Reload sub-admins list
      if (typeof loadSubAdmins === 'function') {
        loadSubAdmins();
      }

    } catch (error) {
      console.error('Password change error:', error);
      alert('❌ Failed to change password: ' + error.message);
    }
  };

  // Add password management buttons to sub-admin list
  function enhanceSubAdminList() {
    // This will be called after sub-admins are loaded
    const subAdminsList = document.getElementById('subAdminsList');
    if (!subAdminsList) return;

    // Add observer to detect when sub-admins are loaded
    const observer = new MutationObserver(() => {
      const subAdminItems = subAdminsList.querySelectorAll('.staff-item, .sub-admin-item');
      subAdminItems.forEach(item => {
        // Check if password button already exists
        if (item.querySelector('.password-btn')) return;

        const actionsDiv = item.querySelector('.staff-actions');
        if (!actionsDiv) return;

        const subAdminId = item.dataset.id || item.getAttribute('data-id');
        const username = item.querySelector('h3')?.textContent || 'Sub-Admin';

        // Add password management button
        const passwordBtn = document.createElement('button');
        passwordBtn.className = 'btn-edit password-btn';
        passwordBtn.innerHTML = '🔐 Password';
        passwordBtn.style.background = '#8b5cf6';
        passwordBtn.onclick = () => showChangePasswordModal(subAdminId, username);
        
        actionsDiv.insertBefore(passwordBtn, actionsDiv.firstChild);
      });
    });

    observer.observe(subAdminsList, { childList: true, subtree: true });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceSubAdminList);
  } else {
    enhanceSubAdminList();
  }

  console.log('✅ Sub-Admin password management module loaded');

})();
