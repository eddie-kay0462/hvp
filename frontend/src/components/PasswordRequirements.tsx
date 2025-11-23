import { Check, X } from 'lucide-react';

interface PasswordRequirementsProps {
  password: string;
  className?: string;
}

export const PasswordRequirements = ({ password, className }: PasswordRequirementsProps) => {
  const requirements = [
    { label: 'At least 6 characters', test: (p: string) => p.length >= 6 },
    { label: 'Contains lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'Contains uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'Contains a digit', test: (p: string) => /\d/.test(p) },
    { label: 'Contains a symbol', test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      {requirements.map((req, index) => {
        const isValid = req.test(password);
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            {isValid ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="h-4 w-4 text-gray-400" />
            )}
            <span className={isValid ? 'text-green-600' : 'text-muted-foreground'}>
              {req.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

