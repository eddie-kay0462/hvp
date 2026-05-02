import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { PasswordRequirements } from '@/components/PasswordRequirements';
import { toast } from 'sonner';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userType, setUserType] = useState<'buyer' | 'seller'>('buyer');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const validatePassword = (password: string): string | null => {
    if (password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one digit';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one symbol';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!email || !firstName || !lastName || !password) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate terms acceptance
    if (!acceptedTerms) {
      toast.error('You must accept the Terms and Conditions to create an account');
      return;
    }

    // Validate password requirements
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);

    // Prepare signup data for backend (no service data)
    const signupData = {
      email,
      password,
      firstName,
      lastName,
      phoneNumber: phoneNumber || undefined,
      role: userType,
    };

    // Call backend signup endpoint
    const { error } = await signup(signupData);

    setLoading(false);

    if (error) {
      toast.error(error.message || 'Failed to create account');
      return;
    }

    // Navigate to verify email page
    navigate('/verify-email', { state: { email, role: userType } });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center bg-background px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Create an account
            </CardTitle>
            <CardDescription className="text-center">
              Join Hustle Village and start your journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
                {password && <PasswordRequirements password={password} className="mt-2" />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+233 XX XXX XXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label>I want to:</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="userType"
                      value="buyer"
                      checked={userType === 'buyer'}
                      onChange={(e) => setUserType(e.target.value as 'buyer' | 'seller')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Find services (Buyer)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="userType"
                      value="seller"
                      checked={userType === 'seller'}
                      onChange={(e) => setUserType(e.target.value as 'buyer' | 'seller')}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="text-sm">Offer services (Hustler)</span>
                  </label>
                </div>
                {userType === 'seller' && (
                  <p className="text-xs text-muted-foreground">
                    💡 You'll set up your service after verifying your email
                  </p>
                )}
              </div>
              <div className="flex gap-3 items-start">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1 text-sm leading-snug text-foreground">
                  <label htmlFor="terms" className="cursor-pointer font-normal">
                    I agree to the{' '}
                  </label>
                  <button
                    type="button"
                    onClick={() => setTermsDialogOpen(true)}
                    className="inline p-0 align-baseline font-normal text-sm text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Terms and Conditions
                  </button>
                </div>
              </div>
              <Dialog open={termsDialogOpen} onOpenChange={setTermsDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Terms and Conditions for Hustle Village</DialogTitle>
                        <DialogDescription>
                          Please read these terms carefully before creating your account.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 text-sm">
                        <div>
                          <h3 className="font-semibold mb-2">Introduction</h3>
                          <p className="text-muted-foreground">
                            Hustle Village is a digital marketplace that connects people within university and campus communities with trusted freelancers who offer a wide range of services. By signing up, creating a profile, using the platform, booking a service, or accepting work, you agree to be bound by this Terms of Service, User Agreement and Privacy Policy. This document governs all interactions between Customers, Hustlers and Hustle Village. It clarifies how payments are processed (including card or gateway checkout and Mobile Money where offered), how disputes are resolved, how refunds are issued and how user information is collected, protected and used. It is important that you read this document carefully because continued use of Hustle Village means that you fully accept and understand all its provisions.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">1. Definitions and Acceptance</h3>
                          <p className="text-muted-foreground">
                            In this document, the terms "Hustle Village," "we," "our," and "us" refer to the operators of the platform. The term "Buyer" refers to a user who pays for a service, while "Hustler" refers to a user who offers a service. A "Booking" refers to a confirmed service request that is made through the platform. By creating an account, you confirm that you are legally able to enter into contracts and that all information you provide is accurate. You acknowledge that these Terms serve as a binding agreement between you and Hustle Village and that you accept the responsibilities described here without limitation.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">2. Nature and Scope of the Platform</h3>
                          <p className="text-muted-foreground">
                            Hustle Village is a facilitator and not the provider of the services listed on the platform. The platform allows Customers to browse available services, place bookings, make payments, communicate with Hustlers and receive completed services. Hustle Village does not directly provide any of the services that appear on the platform. We do not supervise or control the quality of work delivered by Hustlers and we do not guarantee the outcome of any service. Our role is to provide a trusted environment where Customers can transact safely, where Hustlers can grow their offerings and where both parties can rely on a fair and transparent system.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">3. Payment Procedures and Disbursement of Funds</h3>
                          <p className="text-muted-foreground">
                            Depending on how checkout is configured on the platform, you may pay using an integrated card or mobile-money gateway (for example Paystack), or using Mobile Money (MoMo) to Hustle Village's official MoMo number as shown at checkout. With MoMo, you pay outside the app to the number and instructions we provide, then submit your transaction reference and proof (such as a receipt screenshot) so our team can verify your payment before your booking is marked as paid. With an integrated gateway, payment is initiated and confirmed through that provider. In all cases, funds flow through Hustle Village's designated processes so that your money can be held securely until service delivery and release rules are met. Hustlers do not receive Customer payments directly; disbursements to Hustlers are handled by Hustle Village according to these Terms and the booking workflow on the platform. This is a structured and transparent process; it is not a licensed third-party funds custody service.
                          </p>
                          <p className="text-muted-foreground mt-2">
                            For services that do not require upfront costs, Hustlers are typically paid only after the Customer confirms that the service has been completed satisfactorily through the platform. For services that require significant upfront expenses (such as catering, event decoration or baking), special arrangements such as partial payment in advance may apply where communicated at booking or payment. Milestones or split releases may apply depending on what is agreed between the parties and what the platform supports at checkout. Hustle Village may apply a platform commission or service fee where stated at the time of payment.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">4. Cancellations and Refunds</h3>
                          <p className="text-muted-foreground">
                            Refunds are managed by Hustle Village and follow a fair and transparent policy. If a Customer wishes to cancel a booking before the Hustler begins working, the Customer may be entitled to a full refund apart from platform fees. If the Customer cancels after work has started, the amount refunded will depend on the type of service and the stage of completion. For services that require upfront expenses, the initial deposit is generally non refundable because it is used immediately to purchase materials. For simpler services, refunds may still be possible but will depend on the extent of work already completed. If a Hustler cancels a service after accepting a booking, the Customer will receive a full refund and the Hustler may face platform penalties. Hustle Village reviews all refund requests carefully and may require supporting evidence such as screenshots, photos or descriptions of the issue.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">5. Dispute Resolution</h3>
                          <p className="text-muted-foreground">
                            Hustle Village recognises that disagreements may arise between Buyers and Hustlers. In such cases, disputes must be reported as soon as possible, ideally within twenty four to forty eight hours after the service is delivered or the issue is noticed. The dispute team examines all available information including communication exchanged on the platform, visual evidence of work completed, the original service description and any relevant booking details. After evaluating all sides, Hustle Village determines whether the Customer should receive a refund, whether the Hustler should receive payment or whether the payment should be split in a fair manner. Hustle Village's decision is final. Both parties agree not to challenge or dispute these decisions outside the platform.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">6. Responsibilities of Customers</h3>
                          <p className="text-muted-foreground">
                            Customers agree to provide accurate information when creating bookings. This includes choosing the correct service, providing honest descriptions of their needs and completing payment only through the checkout flow provided by Hustle Village (including gateway checkout or MoMo instructions and proof submission as applicable). Customers agree to cooperate with the dispute team if issues arise. They also agree not to mislead Hustlers, delay service approvals unnecessarily or attempt to avoid paying for services completed through the platform.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">7. Responsibilities of Hustlers</h3>
                          <p className="text-muted-foreground">
                            Hustlers must ensure that the services they offer are described truthfully. They must deliver services professionally and within the agreed timeline. Hustlers agree to use upfront payments responsibly, especially in services that require materials or supplies. They also agree to communicate clearly through the platform and not attempt to move transactions off the platform. Hustlers acknowledge that they are responsible for the quality of their work and that repeated complaints or misconduct may lead to account suspension, delayed payments or permanent removal from Hustle Village.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">8. Privacy Policy</h3>
                          <p className="text-muted-foreground">
                            Hustle Village collects information such as names, email addresses, phone numbers, booking details, payment confirmations, MoMo transaction references and payment proof you submit for verification, and communication sent through the platform. This information is used to operate the platform, process and verify payments, send service-related notifications, improve performance, prevent fraud and support dispute resolution. We do not store full card or bank card numbers on our servers when you pay through a certified card gateway; those details are handled by the payment processor. For Mobile Money, we store what you submit (such as reference and receipt) only as needed to verify and administer your booking. Hustle Village does not sell user data. Information may be shared with authorities when required by law, or with payment partners solely as needed to process a transaction. Users may request account deletion at any time, subject to certain limitations related to ongoing disputes or past transactions.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">9. Liability Limitation</h3>
                          <p className="text-muted-foreground">
                            Hustle Village is not responsible for the quality of services delivered by Hustlers or for any loss, damage or injury that may occur during or after service delivery. The platform facilitates communication and payment but does not supervise Hustlers or verify the accuracy of their claims. Hustle Village's maximum liability is limited to the amount paid for the affected booking. We are not responsible for indirect or consequential damages such as emotional distress, lost opportunities or damages resulting from misunderstandings between users.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">10. Account Suspension and Termination</h3>
                          <p className="text-muted-foreground">
                            Hustle Village may suspend or terminate any account that violates platform rules. This includes cases of fraud, harassment, misuse of funds, repeated disputes, refusal to cooperate with investigations or attempts to bypass the payment system. In certain cases, funds may be held temporarily while we investigate a matter. Users who are removed from the platform lose access to their accounts, ongoing bookings and platform features.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">11. Consent to Terms During Signup</h3>
                          <p className="text-muted-foreground">
                            When creating an account, users must confirm that they have read and accepted these Terms. By proceeding with signup, the user acknowledges that payments are made through Hustle Village's checkout and payment processes (including any gateway or MoMo verification flow in use), that disbursements to Hustlers are handled by Hustle Village as described above, and that all policies in this document govern their participation on the platform.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">12. Invoice Terms</h3>
                          <p className="text-muted-foreground">
                            When a Customer completes a verified payment, Hustle Village may generate an invoice where the platform provides one. The invoice typically contains the Customer's name, the Hustler's name, the booking number, the service purchased, the amount paid, the date of payment, and a payment reference (such as a gateway reference or Mobile Money transaction identifier, depending on how you paid). The invoice may be available in your account and may be sent or referenced by email where configured. The document serves as proof of payment for use in disputes or service reviews where applicable.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">13. Governing Law</h3>
                          <p className="text-muted-foreground">
                            This agreement is governed by the laws of the Republic of Ghana. Any matter not resolved by Hustle Village's internal dispute procedure may be considered under Ghanaian law.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">14. Contact Information</h3>
                          <p className="text-muted-foreground">
                            Users may contact Hustle Village for support, questions, complaints or clarifications. Communication can be directed to our support email or our listed contact phone number. We aim to respond promptly and resolve issues in a fair and professional manner.
                          </p>
                        </div>
                      </div>
                    </DialogContent>
              </Dialog>
              <Button type="submit" className="w-full" disabled={loading || !acceptedTerms}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Button
                variant="link"
                className="p-0 h-auto font-normal"
                onClick={() => navigate('/login')}
              >
                Log in
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Signup;
