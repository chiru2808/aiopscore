import { typeboxResolver } from '@hookform/resolvers/typebox';
import { Type, Static } from '@sinclair/typebox';
import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckEmailNote } from '@/features/authentication/components/check-email-note';
import { HttpError } from '@/lib/api';
import { authenticationApi } from '@/lib/authentication-api';
import { ForgotPasswordRequest, OtpType } from '@activepieces/shared';

const FormSchema = Type.Object({
  email: Type.String({
    errorMessage: t('Please enter your email'),
  }),
});

type FormSchema = Static<typeof FormSchema>;

const ResetPasswordForm = () => {
  const [isSent, setIsSent] = useState<boolean>(false);
  const form = useForm<FormSchema>({
    resolver: typeboxResolver(FormSchema),
    defaultValues: {},
  });

  const { mutate, isPending } = useMutation<
    void,
    HttpError,
    ForgotPasswordRequest
  >({
    mutationFn: authenticationApi.forgotPassword,
    onSuccess: () => setIsSent(true),
    onError: (error) => {
      form.setError('root.serverError', {
        message: t('Something went wrong, please try again later'),
      });
    },
  });

  const onSubmit: SubmitHandler<ForgotPasswordRequest> = (data) => {
    mutate(data);
  };

  return (
    <Card className="w-[28rem] rounded-sm drop-shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">
          {isSent ? t('Check Your Inbox') : t('Reset Password')}
        </CardTitle>
        <CardDescription>
          {isSent ? (
            <CheckEmailNote
              email={form.getValues().email.trim().toLocaleLowerCase()}
              type={OtpType.PASSWORD_RESET}
            />
          ) : (
            <span>
              {t(
                `If an account exists for this email, we have sent a password reset link.`
              )}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isSent && (
          <Form {...form}>
            <form className="grid ">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="w-full grid space-y-2">
                    <Label htmlFor="email">{t('Email')}</Label>
                    <Input
                      {...field}
                      type="text"
                      placeholder={'email@example.com'}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form?.formState?.errors?.root?.serverError && (
                <FormMessage>
                  {form.formState.errors.root.serverError.message}
                </FormMessage>
              )}
              <Button
                className="w-full mt-4"
                loading={isPending}
                onClick={(e) => form.handleSubmit(onSubmit)(e)}
              >
                {t('Send Password Reset Link')}
              </Button>
            </form>
          </Form>
        )}
        <div className="mt-4 text-center text-sm">
          <Link to="/sign-in" className="text-muted-foreground">
            {t('Back to sign in')}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

ResetPasswordForm.displayName = 'ResetPassword';

export { ResetPasswordForm };
