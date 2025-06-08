# Registration Flow Tests

This directory contains tests that verify the registration flow provides immediate user data availability in the HomeComponent, matching the login flow behavior.

## Test Files

### 1. `registration-flow.spec.ts`
Angular/TypeScript test file that simulates:
- AuthService behavior for registration vs login
- HomeComponent user data consumption
- UI state management
- Session storage operations

### 2. `registration-flow-integration.test.js`
Node.js integration test that simulates the complete flow:
- Form validation
- API request/response
- Authentication state management
- Navigation to HomeComponent
- UI rendering verification

## Test Objectives

✅ **Immediate Data Availability**: Verify user data is available immediately after registration without additional API calls

✅ **Consistent Behavior**: Ensure registration flow matches login flow behavior exactly

✅ **UI Display**: Confirm HomeComponent displays user name and avatar immediately

✅ **State Management**: Validate proper BehaviorSubject updates and session storage

✅ **Navigation**: Test seamless redirect to /home with user data available

## Running Tests

```bash
# Run the integration test
node registration-flow-integration.test.js

# For Angular tests (if testing framework is set up)
ng test --include="tests/registration-flow.spec.ts"
```

## Key Verification Points

1. **AuthService.register()** calls `handleAuthSuccess()` with user data
2. **handleAuthSuccess()** updates BehaviorSubjects immediately
3. **HomeComponent** subscribes to auth state changes
4. **User data** is available synchronously after registration
5. **UI elements** render immediately with user information
6. **Avatar generation** works correctly for users without profile pictures
7. **Session persistence** maintains user data across page reloads

## Expected Results

After successful registration:
- User name displayed in header: `{{ currentUser?.full_name || currentUser?.username }}`
- Avatar generated: `https://ui-avatars.com/api/?name=...`
- Authentication actions visible: Write button, My Blogs, Profile dropdown
- User menu functional with profile options
- Identical behavior to login flow

## Test Coverage

- ✅ Registration form validation
- ✅ API data transformation
- ✅ Backend response handling
- ✅ AuthService state management
- ✅ HomeComponent initialization
- ✅ UI rendering verification
- ✅ Session storage persistence
- ✅ Navigation behavior
- ✅ Error handling scenarios

