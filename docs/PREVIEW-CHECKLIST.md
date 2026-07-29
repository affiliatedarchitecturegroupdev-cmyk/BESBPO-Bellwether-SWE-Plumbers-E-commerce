# Bellwether SWE E-Commerce - Feature Readiness Checklist

## Quick Reference for Preview Deployment

This checklist helps verify the platform is ready for initial preview on Render.

---

## ✅ Pre-Deployment Verification

### 1. Repository & Code
- [ ] Code pushed to GitHub repository
- [ ] All tests passing in CI
- [ ] No critical linting errors
- [ ] TypeScript compilation successful

### 2. Render Configuration
- [ ] `render.yaml` reviewed and validated
- [ ] All required secrets identified
- [ ] GitHub Actions secrets configured:
  - [ ] `RENDER_API_KEY`
  - [ ] PayFast sandbox credentials
  - [ ] Keycloak configuration

### 3. External Services (Sandbox/Test Mode)
- [ ] PayFast sandbox account created
- [ ] PayFast sandbox credentials configured
- [ ] Keycloak test realm configured
- [ ] Sentry project created (optional)

---

## 🔧 Service-by-Service Checklist

### API Service (`bellwetherswe-api`)
- [ ] DATABASE_URL configured
- [ ] REDIS_URL configured
- [ ] KEYCLOAK_* variables set
- [ ] PAYFAST_* variables set (sandbox)
- [ ] PUBLIC_WEB_URL set
- [ ] AI_SERVICE_URL accessible
- [ ] Health check passing
- [ ] Database migrations applied
- [ ] Sample data seeded

### Web Service (`bellwetherswe-web`)
- [ ] NEXT_PUBLIC_API_URL pointing to API
- [ ] AUTH_SECRET configured
- [ ] AUTH_KEYCLOAK_* variables set
- [ ] All pages loading without errors
- [ ] Mobile responsiveness verified

### AI Service (`bellwetherswe-ai`)
- [ ] DATABASE_URL configured
- [ ] API_BASE_URL configured
- [ ] ANTHROPIC_API_KEY set (optional for v1)
- [ ] Health check passing

### Worker Service (`bellwetherswe-worker`)
- [ ] REDIS_URL configured
- [ ] NOTIFICATION_CHANNEL set
- [ ] SMS credentials (if enabled)

---

## 🧪 Functional Testing Checklist

### Customer Journey
- [ ] **Registration**: New customer can create account
- [ ] **Login**: Existing customer can log in
- [ ] **Browse**: Products display correctly
- [ ] **Search**: Search returns relevant results
- [ ] **Category**: Category pages show products
- [ ] **Product Detail**: Product info displays correctly
- [ ] **Add to Cart**: Items can be added to cart
- [ ] **Cart**: Cart persists across sessions
- [ ] **Checkout**: Checkout flow works end-to-end
- [ ] **Payment**: PayFast sandbox payment completes
- [ ] **Confirmation**: Order confirmation displays
- [ ] **Email**: Confirmation email received

### Account Features
- [ ] **Order History**: Past orders display
- [ ] **Order Detail**: Individual order details viewable
- [ ] **Profile Edit**: Can update profile info
- [ ] **Addresses**: Can add/edit delivery addresses
- [ ] **Wishlist**: Can add items to wishlist
- [ ] **Bookings**: Can request installation booking

### Trade/Professional Features
- [ ] **Trade Application**: Can apply for trade account
- [ ] **Bulk Order**: Bulk ordering page accessible
- [ ] **Quote Request**: Can submit quote request
- [ ] **Credit Terms**: Credit terms information available

### Admin Features
- [ ] **Product Management**: Can add/edit products
- [ ] **Category Management**: Can manage categories
- [ ] **Order Management**: Can view and update orders
- [ ] **Customer Management**: Can view customer accounts

---

## 📱 Browser/Device Testing

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Devices
- [ ] iOS Safari (iPhone/iPad)
- [ ] Chrome Mobile (Android)
- [ ] Responsive layout verified

---

## 🔒 Security Verification

- [ ] HTTPS enforced on all pages
- [ ] Environment variables not exposed
- [ ] API authentication working
- [ ] Rate limiting functional
- [ ] Input validation on all forms
- [ ] XSS protection enabled

---

## 📊 Monitoring Setup

- [ ] Sentry error tracking configured
- [ ] Health checks monitoring active
- [ ] Error alerts configured
- [ ] Performance monitoring (optional)

---

## 🚀 Post-Deployment Verification

After deployment, verify:

1. **Health Checks**
   ```bash
   curl https://bellwetherswe-api-staging.onrender.com/v1/health
   curl https://bellwetherswe-ai-staging.onrender.com/health
   ```

2. **API Docs**
   - Visit https://bellwetherswe-api-staging.onrender.com/docs
   - Verify Swagger UI loads

3. **Web Application**
   - Visit the deployed web URL
   - Verify homepage loads
   - Test basic functionality

4. **Integration Flow**
   - Create test account
   - Add product to cart
   - Complete test checkout

---

## 📝 Troubleshooting Common Issues

### Database Connection Failed
- Check DATABASE_URL format
- Verify PostgreSQL is running
- Check connection pool settings

### API Returns 500
- Check API logs in Render dashboard
- Verify environment variables
- Test health endpoint first

### Payment Not Working
- Verify PayFast sandbox credentials
- Check PayFast mode setting
- Review ITN callback URL

### AI Service Not Responding
- Check health endpoint
- Verify ANTHROPIC_API_KEY
- Review service logs

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Project Docs**: `/docs/`
- **API Schema**: Available at `/docs` when deployed
- **GitHub Issues**: Create issue for bugs

---

## ✅ Sign-Off

Before declaring preview ready:

- [ ] All critical tests passing
- [ ] Security checklist complete
- [ ] Basic functionality verified
- [ ] Team has access to monitoring
- [ ] Support contacts documented
