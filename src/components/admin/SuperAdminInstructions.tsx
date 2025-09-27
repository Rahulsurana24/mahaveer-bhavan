import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';

export const SuperAdminInstructions = () => {
  return (
    <Card className="p-6 max-w-2xl mx-auto mt-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold text-lg">Super Admin Setup Instructions</h3>
        </div>

        <div className="bg-muted p-4 rounded-lg">
          <h4 className="font-medium mb-2">Default Super Admin Account:</h4>
          <div className="space-y-1 text-sm font-mono">
            <div><strong>Email:</strong> rahulsuranat@gmail.com</div>
            <div><strong>Password:</strong> 9480413653@Rahul</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">1</Badge>
            <div>
              <p className="font-medium">Sign up with the super admin email</p>
              <p className="text-sm text-muted-foreground">
                Use the registration form with email: rahulsuranat@gmail.com and password: 9480413653@Rahul
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">2</Badge>
            <div>
              <p className="font-medium">Automatic super admin role assignment</p>
              <p className="text-sm text-muted-foreground">
                The system will automatically assign super admin privileges to this email address
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Badge variant="outline" className="mt-0.5">3</Badge>
            <div>
              <p className="font-medium">Access admin panel</p>
              <p className="text-sm text-muted-foreground">
                After signing in, navigate to /admin/dashboard to access all admin features
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span className="font-medium">Note</span>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 mt-1">
            The enhanced registration form now collects all required member information including personal details, 
            address, membership type, and emergency contact information as specified in your requirements.
          </p>
        </div>
      </div>
    </Card>
  );
};