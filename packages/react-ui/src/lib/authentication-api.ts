import { api } from '@/lib/api';
import {
  CreateOtpRequestBody,
  ResetPasswordRequest,
  ForgotPasswordRequest,
  VerifyEmailRequestBody,
} from '@activepieces/shared';
import {
  AuthenticationResponse,
  ClaimTokenRequest,
  FederatedAuthnLoginResponse,
  ProjectRole,
  SignInRequest,
  SignUpRequest,
  SwitchPlatformRequest,
  SwitchProjectRequest,
  ThirdPartyAuthnProviderEnum,
  UserIdentity,
} from '@activepieces/shared';

export const authenticationApi = {
  signIn(request: SignInRequest) {
    return api.post<AuthenticationResponse>(
      '/v1/authentication/sign-in',
      request,
    );
  },
  signUp(request: SignUpRequest) {
    return api.post<AuthenticationResponse>(
      '/v1/authentication/sign-up',
      request,
    );
  },
  getFederatedAuthLoginUrl(providerName: ThirdPartyAuthnProviderEnum) {
    return api.get<FederatedAuthnLoginResponse>(`/v1/authn/federated/login`, {
      providerName,
    });
  },
  getCurrentProjectRole() {
    return api.get<ProjectRole | null>('/v1/project-members/role');
  },
  claimThirdPartyRequest(request: ClaimTokenRequest) {
    return api.post<AuthenticationResponse>(
      '/v1/authn/federated/claim',
      request,
    );
  },
  sendOtpEmail(request: CreateOtpRequestBody) {
    return api.post<void>('/v1/authentication/otp', request);
  },
  resetPassword(request: ResetPasswordRequest) {
    return api.post<void>('/v1/authentication/reset-password', request);
  },
  forgotPassword(request: ForgotPasswordRequest) {
    return api.post<void>('/v1/authentication/forgot-password', request);
  },
  verifyEmail(request: VerifyEmailRequestBody) {
    return api.post<UserIdentity>('/v1/authentication/verify-email', request);
  },
  resendVerificationEmail(email: string) {
    return api.post<{ success: boolean }>('/v1/authentication/resend-verification', { email });
  },
  switchProject(request: SwitchProjectRequest) {
    return api.post<AuthenticationResponse>(
      `/v1/authentication/switch-project`,
      request,
    );
  },
  switchPlatform(request: SwitchPlatformRequest) {
    return api.post<AuthenticationResponse>(
      `/v1/authentication/switch-platform`,
      request,
    );
  },
};
