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
              <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                  className="mt-1"
                />
                <Label
                  htmlFor="terms"
                  className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  I agree to the{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setTermsDialogOpen(true);
                    }}
                    className="text-primary underline hover:text-primary/80"
                  >
                    Terms and Conditions
                  </button>
                </Label>
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
                            Hustle Village is a digital marketplace that connects people within university and campus communities with trusted freelancers who offer a wide range of services. By signing up, creating a profile, using the platform, booking a service, or accepting work, you agree to be bound by this Terms of Service, User Agreement and Privacy Policy. This document governs all interactions between Customers, Hustlers and Hustle Village. It clarifies how payments are processed, how disputes are resolved, how refunds are issued and how user information is collected, protected and used. It is important that you read this document carefully because continued use of Hustle Village means that you fully accept and understand all its provisions.
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
                            When a Customer pays for a service through Paystack, the entire payment is first received into Hustle Village's designated company account. This ensures a centralised and secure payment process. It also allows us to protect both parties by holding the funds while the service is being delivered. The Customer acknowledges that Hustlers do not receive funds directly from Customers and that all disbursements are handled manually by Hustle Village. After the service is delivered, or after certain conditions are met, Hustle Village releases funds to the Hustler. This system operates similarly to escrow, but it is not classified as licensed escrow. It is simply a structured and transparent financial process that protects both the Customer and the Hustler.
                          </p>
                          <p className="text-muted-foreground mt-2">
                            For services that do not require upfront costs, Hustlers are paid only after the Customer confirms that the service has been completed satisfactorily. For services that require significant upfront expenses, such as catering, event decoration or baking, Hustlers may receive 50% of the payment in advance so that they can acquire the necessary materials. The remaining 50% is released only after the final product has been delivered and accepted by the Customer. For digital or creative services such as design or photography, payments may be fully released after delivery or in milestones depending on what is agreed between the parties. Hustle Village may apply a platform commission or service fee which will be displayed clearly at the time of payment.
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
                            Customers agree to provide accurate information when creating bookings. This includes choosing the correct service, providing honest descriptions of their needs and ensuring that they make payments through the official Hustle Village payment system. Customers agree to cooperate with the dispute team if issues arise. They also agree not to mislead Hustlers, delay service approvals unnecessarily or attempt to avoid paying for services completed through the platform.
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
                            Hustle Village collects information such as names, email addresses, phone numbers, booking details, payment confirmations and communication sent through the platform. This information is used to operate the platform, process payments, improve performance, prevent fraud and support dispute resolution. We do not store full card details because payment processing is handled by Paystack which is certified under strict security standards. Hustle Village does not sell user data. Information may be shared with authorities only when required by law or with Paystack solely for payment processing purposes. Users may request account deletion at any time, subject to certain limitations related to ongoing disputes or past transactions.
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
                            When creating an account, users must confirm that they have read and accepted these Terms. By proceeding with signup, the user acknowledges that all payments are made through Hustle Village, that disbursements are handled by Hustle Village and that all policies described in this document govern their participation on the platform.
                          </p>
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">12. Invoice Terms</h3>
                          <p className="text-muted-foreground">
                            When a Customer completes a payment, Hustle Village generates an invoice. This invoice contains the Customer's name, the Hustler's name, the booking number, the service purchased, the amount paid, the date of payment, the Paystack reference and the applicable disbursement method. The invoice is sent to the Customer by email and may also be stored in the user's account. The document serves as formal proof of payment and can be used for reference during disputes or service reviews.
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
