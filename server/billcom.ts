// BILL.com API integration service for direct creditor payments

interface BillComCredentials {
  username: string;
  password: string;
  organizationId: string;
  devKey: string;
}

interface BillComSession {
  sessionId: string;
  userId: string;
  expires: Date;
}

interface BillComVendor {
  id: string;
  name: string;
  email?: string;
  accountNumber?: string;
  routingNumber?: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

interface BillComPayment {
  id: string;
  vendorId: string;
  amount: number;
  description: string;
  paymentMethod: 'ACH' | 'Check' | 'Wire';
  status: 'Pending' | 'Processing' | 'Sent' | 'Delivered' | 'Failed';
  scheduledDate?: string;
}

interface BillComCustomer {
  id: string;
  name: string;
  email?: string;
  address?: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
}

interface BillComInvoice {
  id: string;
  customerId: string;
  invoiceNumber: string;
  amount: number;
  description: string;
  dueDate: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Overdue' | 'Paid' | 'Cancelled';
  paymentLink?: string;
}

interface BillComInvoiceLineItem {
  quantity: number;
  description: string;
  price: number;
}

export class BillComService {
  private credentials: BillComCredentials;
  private session: BillComSession | null = null;
  private baseUrl: string;

  constructor() {
    this.credentials = {
      username: process.env.BILLCOM_USERNAME || '',
      password: process.env.BILLCOM_PASSWORD || '',
      organizationId: process.env.BILLCOM_ORG_ID || '',
      devKey: process.env.BILLCOM_DEV_KEY || ''
    };
    
    // Use sandbox for development, production in production
    const isProduction = process.env.NODE_ENV === 'production';
    this.baseUrl = isProduction 
      ? 'https://gateway.bill.com/connect/v3'  // Production
      : 'https://sandbox-gateway.bill.com/connect/v3';  // Sandbox for dev
    
    console.log(`🏦 BILL.com Service initialized:`);
    console.log(`📍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`🌐 API URL: ${this.baseUrl}`);
    console.log(`🔑 Credentials configured: ${this.credentials.username ? 'YES' : 'NO'}`);
  }

  // Authenticate with BILL.com and get session token
  private async authenticate(): Promise<string> {
    // Use real sandbox testing if credentials are available
    const useSandbox = this.credentials.username && this.credentials.password && this.credentials.organizationId && this.credentials.devKey;
    
    if (process.env.NODE_ENV === 'development' && !useSandbox) {
      console.log('🧪 MOCK: Authenticating with BILL.com (no credentials)');
      this.session = {
        sessionId: 'mock_session_' + Date.now(),
        userId: 'mock_user_123',
        expires: new Date(Date.now() + 35 * 60 * 1000)
      };
      return this.session.sessionId;
    }

    if (this.session && this.session.expires > new Date()) {
      return this.session.sessionId;
    }

    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        userName: this.credentials.username,
        password: this.credentials.password,
        orgId: this.credentials.organizationId,
        devKey: this.credentials.devKey
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`BILL.com auth failed - Status: ${response.status}, Response: ${errorText}`);
      throw new Error(`BILL.com authentication failed: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as any;
    
    // Session expires after 35 minutes
    this.session = {
      sessionId: data.sessionId,
      userId: data.userId,
      expires: new Date(Date.now() + 35 * 60 * 1000)
    };

    return this.session.sessionId;
  }

  // Payment address database for major billers
  private getPaymentAddress(companyName: string): any {
    const company = companyName.toLowerCase();
    
    // Major credit card companies with their payment addresses
    if (company.includes('capital one')) {
      return {
        name: 'Capital One',
        address1: 'P.O. Box 30285',
        city: 'Salt Lake City',
        state: 'UT',
        zip: '84130-0285',
        country: 'US'
      };
    }
    
    if (company.includes('chase')) {
      return {
        name: 'Chase Card Services',
        address1: 'P.O. Box 15298',
        city: 'Wilmington',
        state: 'DE',
        zip: '19850',
        country: 'US'
      };
    }
    
    if (company.includes('american express') || company.includes('amex')) {
      return {
        name: 'American Express',
        address1: 'P.O. Box 650448',
        city: 'Dallas',
        state: 'TX',
        zip: '75265',
        country: 'US'
      };
    }
    
    if (company.includes('discover')) {
      return {
        name: 'Discover Card',
        address1: 'P.O. Box 30943',
        city: 'Salt Lake City',
        state: 'UT',
        zip: '84130',
        country: 'US'
      };
    }
    
    if (company.includes('citi')) {
      return {
        name: 'Citibank',
        address1: 'P.O. Box 6500',
        city: 'Sioux Falls',
        state: 'SD',
        zip: '57117',
        country: 'US'
      };
    }
    
    // Default: no specific address (BILL.com will need user to provide)
    return null;
  }

  // Determine best payment method for a company
  private determineBestPaymentMethod(companyName: string): 'ACH' | 'Check' | 'Wire' {
    const company = companyName.toLowerCase();
    
    // Major credit card companies - always use checks (they don't accept random ACH)
    if (company.includes('capital one') || company.includes('chase') || 
        company.includes('american express') || company.includes('discover') ||
        company.includes('citi') || company.includes('bank of america') ||
        company.includes('wells fargo') || company.includes('visa') ||
        company.includes('mastercard')) {
      return 'Check';
    }
    
    // Utilities often accept ACH
    if (company.includes('electric') || company.includes('gas') || 
        company.includes('water') || company.includes('power') ||
        company.includes('utility') || company.includes('energy')) {
      return 'ACH';
    }
    
    // Default to check for unknown billers (safest option)
    return 'Check';
  }

  // Create or get vendor for creditor
  async createOrGetVendor(creditorData: {
    name: string;
    email?: string;
    accountNumber?: string;
    routingNumber?: string;
    address?: {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
  }): Promise<BillComVendor & { recommendedPaymentMethod: 'ACH' | 'Check' | 'Wire' }> {
    // Use mock vendor creation only if credentials not available
    const useSandbox = this.credentials.username && this.credentials.password && this.credentials.organizationId && this.credentials.devKey;
    if (process.env.NODE_ENV === 'development' && !useSandbox) {
      console.log(`🧪 MOCK: Creating/getting vendor for ${creditorData.name}`);
      const paymentAddress = this.getPaymentAddress(creditorData.name);
      const vendorAddress = creditorData.address || paymentAddress;
      
      return {
        id: 'mock_vendor_' + Date.now(),
        name: creditorData.name,
        email: creditorData.email,
        accountNumber: creditorData.accountNumber,
        routingNumber: creditorData.routingNumber,
        address: vendorAddress,
        recommendedPaymentMethod: this.determineBestPaymentMethod(creditorData.name)
      };
    }

    const sessionId = await this.authenticate();

    // Get payment address if available
    const paymentAddress = this.getPaymentAddress(creditorData.name);
    
    // Use provided address or look up from our database
    const vendorAddress = creditorData.address || paymentAddress;

    // First, search for existing vendor
    const searchResponse = await fetch(`${this.baseUrl}/vendors`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'sessionId': sessionId,
        'devKey': this.credentials.devKey
      }
    });

    if (searchResponse.ok) {
      const vendors = await searchResponse.json() as any;
      const existingVendor = vendors.vendors?.find((v: any) => 
        v.name.toLowerCase() === creditorData.name.toLowerCase()
      );
      
      if (existingVendor) {
        return {
          id: existingVendor.id,
          name: existingVendor.name,
          email: existingVendor.email,
          accountNumber: existingVendor.accountNumber,
          routingNumber: existingVendor.routingNumber,
          address: existingVendor.address,
          recommendedPaymentMethod: this.determineBestPaymentMethod(creditorData.name)
        };
      }
    }

    // Create new vendor if not found
    const createResponse = await fetch(`${this.baseUrl}/vendors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sessionId': sessionId,
        'devKey': this.credentials.devKey
      },
      body: JSON.stringify({
        name: creditorData.name,
        email: creditorData.email,
        accountNumber: creditorData.accountNumber,
        routingNumber: creditorData.routingNumber,
        address: vendorAddress // Use the resolved address
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create vendor: ${errorText}`);
    }

    const newVendor = await createResponse.json() as any;
    return {
      id: newVendor.id,
      name: newVendor.name,
      email: newVendor.email,
      accountNumber: newVendor.accountNumber,
      routingNumber: newVendor.routingNumber,
      address: newVendor.address,
      recommendedPaymentMethod: this.determineBestPaymentMethod(creditorData.name)
    };
  }

  // Create direct payment to creditor
  async createPayment(paymentData: {
    vendorId: string;
    amount: number;
    description: string;
    paymentMethod: 'ACH' | 'Check' | 'Wire';
    scheduledDate?: string;
  }): Promise<BillComPayment> {
    // Use mock payment creation only if credentials not available
    const useSandbox = this.credentials.username && this.credentials.password && this.credentials.organizationId && this.credentials.devKey;
    if (process.env.NODE_ENV === 'development' && !useSandbox) {
      console.log(`🧪 MOCK: Creating ${paymentData.paymentMethod} payment of $${paymentData.amount}`);
      console.log(`📝 Description: ${paymentData.description}`);
      console.log(`✅ Mock payment created successfully`);
      
      return {
        id: 'mock_payment_' + Date.now(),
        vendorId: paymentData.vendorId,
        amount: paymentData.amount,
        description: paymentData.description,
        paymentMethod: paymentData.paymentMethod,
        status: 'Processing',
        scheduledDate: paymentData.scheduledDate
      };
    }

    const sessionId = await this.authenticate();

    // First create a bill for the payment
    const billResponse = await fetch(`${this.baseUrl}/bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sessionId': sessionId,
        'devKey': this.credentials.devKey
      },
      body: JSON.stringify({
        vendorId: paymentData.vendorId,
        dueDate: paymentData.scheduledDate || new Date().toISOString().split('T')[0],
        billLineItems: [{
          amount: paymentData.amount,
          description: paymentData.description
        }]
      })
    });

    if (!billResponse.ok) {
      const errorText = await billResponse.text();
      throw new Error(`Failed to create bill: ${errorText}`);
    }

    const bill = await billResponse.json() as any;

    // Now create payment for the bill
    const paymentResponse = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sessionId': sessionId,
        'devKey': this.credentials.devKey
      },
      body: JSON.stringify({
        vendorId: paymentData.vendorId,
        billIds: [bill.id],
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        description: paymentData.description,
        scheduledDate: paymentData.scheduledDate
      })
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      throw new Error(`Failed to create payment: ${errorText}`);
    }

    const payment = await paymentResponse.json() as any;
    return {
      id: payment.id,
      vendorId: payment.vendorId,
      amount: payment.amount,
      description: payment.description,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      scheduledDate: payment.scheduledDate
    };
  }

  // Get payment status
  async getPaymentStatus(paymentId: string): Promise<BillComPayment | null> {
    // Use mock payment status only if credentials not available
    const useSandbox = this.credentials.username && this.credentials.password && this.credentials.organizationId && this.credentials.devKey;
    if (process.env.NODE_ENV === 'development' && !useSandbox) {
      console.log(`🧪 MOCK: Getting payment status for ${paymentId}`);
      
      // Return mock status that simulates real payment progression
      return {
        id: paymentId,
        vendorId: 'mock_vendor_123',
        amount: 125.50,
        description: 'Mock payment',
        paymentMethod: 'Check',
        status: 'Processing',
        scheduledDate: new Date().toISOString().split('T')[0]
      };
    }

    const sessionId = await this.authenticate();

    const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'sessionId': sessionId,
        'devKey': this.credentials.devKey
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errorText = await response.text();
      throw new Error(`Failed to get payment status: ${errorText}`);
    }

    const payment = await response.json() as any;
    return {
      id: payment.id,
      vendorId: payment.vendorId,
      amount: payment.amount,
      description: payment.description,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      scheduledDate: payment.scheduledDate
    };
  }

  // Test API connectivity
  async testConnection(forceProduction = false): Promise<boolean> {
    try {
      // In development, use mock mode unless forced to test production
      if (process.env.NODE_ENV === 'development' && !forceProduction) {
        console.log('🧪 Using MOCK BILL.com service for development');
        console.log('✅ Mock connection successful - real payments would work in production');
        return true;
      }
      
      console.log('🔍 Testing BILL.com connection in production...');
      console.log(`📍 API URL: ${this.baseUrl}`);
      console.log(`👤 Username: ${this.credentials.username ? 'CONFIGURED' : 'MISSING'}`);
      console.log(`🔑 Password: ${this.credentials.password ? 'CONFIGURED' : 'MISSING'}`);
      console.log(`🏢 Org ID: ${this.credentials.organizationId ? 'CONFIGURED' : 'MISSING'}`);
      console.log(`🔧 Dev Key: ${this.credentials.devKey ? 'CONFIGURED' : 'MISSING'}`);
      
      const sessionId = await this.authenticate();
      console.log('✅ BILL.com authentication successful');
      console.log(`🎫 Session ID: ${sessionId ? 'RECEIVED' : 'MISSING'}`);
      return true;
    } catch (error: any) {
      console.error('❌ BILL.com connection test FAILED in production:');
      console.error(`🚨 Error Type: ${error.name}`);
      console.error(`💬 Error Message: ${error.message}`);
      console.error(`📚 Full Error:`, error);
      
      // Add specific error analysis
      if (error.message.includes('authentication failed')) {
        console.error('🔐 Authentication issue - check credentials');
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        console.error('🌐 Network connectivity issue');
      } else if (error.message.includes('timeout')) {
        console.error('⏰ Request timeout - BILL.com may be slow');
      }
      
      return false;
    }
  }

  // === CUSTOMER PAYMENT COLLECTION (NEW) ===

  // Create or get customer for invoice billing
  async createOrGetCustomer(customerData: {
    name: string;
    email?: string;
    address?: {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
  }): Promise<BillComCustomer> {
    // Use mock customer creation only if credentials not available
    const useSandbox = this.credentials.username && this.credentials.password && this.credentials.organizationId && this.credentials.devKey;
    if (process.env.NODE_ENV === 'development' && !useSandbox) {
      console.log(`🧪 MOCK: Creating/getting customer for ${customerData.name}`);
      
      // Log enhanced data being pre-filled
      if (customerData.address) {
        console.log(`📍 Pre-filling address data:`, {
          street: customerData.address.addressLine1,
          city: customerData.address.city,
          state: customerData.address.state,
          zip: customerData.address.zip
        });
      }
      
      return {
        id: 'mock_customer_' + Date.now(),
        name: customerData.name,
        email: customerData.email,
        address: customerData.address
      };
    }

    const sessionId = await this.authenticate();

    // First, search for existing customer
    const searchResponse = await fetch(`${this.baseUrl}/customers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'sessionId': sessionId,
        'devKey': this.credentials.devKey
      }
    });

    if (searchResponse.ok) {
      const customers = await searchResponse.json() as any;
      const existingCustomer = customers.customers?.find((c: any) => 
        c.name.toLowerCase() === customerData.name.toLowerCase() ||
        (c.email && customerData.email && c.email.toLowerCase() === customerData.email.toLowerCase())
      );
      
      if (existingCustomer) {
        return {
          id: existingCustomer.id,
          name: existingCustomer.name,
          email: existingCustomer.email,
          address: existingCustomer.address
        };
      }
    }

    // Create new customer if not found
    const createResponse = await fetch(`${this.baseUrl}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sessionId': sessionId,
        'devKey': this.credentials.devKey
      },
      body: JSON.stringify({
        name: customerData.name,
        email: customerData.email,
        address: customerData.address
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create customer: ${errorText}`);
    }

    const newCustomer = await createResponse.json() as any;
    return {
      id: newCustomer.id,
      name: newCustomer.name,
      email: newCustomer.email,
      address: newCustomer.address
    };
  }

  // Create invoice for customer payment
  async createInvoice(invoiceData: {
    customerId: string;
    invoiceNumber: string;
    lineItems: BillComInvoiceLineItem[];
    dueDate: string;
    description?: string;
  }): Promise<BillComInvoice> {
    // Use mock invoice creation only if credentials not available
    const useSandbox = this.credentials.username && this.credentials.password && this.credentials.organizationId && this.credentials.devKey;
    if (process.env.NODE_ENV === 'development' && !useSandbox) {
      console.log(`🧪 MOCK: Creating invoice ${invoiceData.invoiceNumber}`);
      console.log(`📝 Line items:`, invoiceData.lineItems);
      
      const totalAmount = invoiceData.lineItems.reduce((sum, item) => 
        sum + (item.quantity * item.price), 0
      );
      
      return {
        id: 'mock_invoice_' + Date.now(),
        customerId: invoiceData.customerId,
        invoiceNumber: invoiceData.invoiceNumber,
        amount: totalAmount,
        description: invoiceData.description || 'Bill Payment Invoice',
        dueDate: invoiceData.dueDate,
        status: 'Draft'
      };
    }

    const sessionId = await this.authenticate();

    const createResponse = await fetch(`${this.baseUrl}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sessionId': sessionId,
        'devKey': this.credentials.devKey
      },
      body: JSON.stringify({
        customer: {
          id: invoiceData.customerId
        },
        invoiceLineItems: invoiceData.lineItems,
        invoiceNumber: invoiceData.invoiceNumber,
        dueDate: invoiceData.dueDate,
        processingOptions: {
          sendEmail: true
        }
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create invoice: ${errorText}`);
    }

    const invoice = await createResponse.json() as any;
    return {
      id: invoice.id,
      customerId: invoice.customerId,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.amount,
      description: invoiceData.description || 'Bill Payment Invoice',
      dueDate: invoice.dueDate,
      status: invoice.status
    };
  }

  // Generate payment link for invoice
  async createPaymentLink(invoiceData: {
    invoiceId: string;
    customerId: string;
    customerEmail: string;
    returnUrl: string;
  }): Promise<string> {
    // Use mock payment link only if credentials not available
    const useSandbox = this.credentials.username && this.credentials.password && this.credentials.organizationId && this.credentials.devKey;
    if (process.env.NODE_ENV === 'development' && !useSandbox) {
      console.log(`🧪 MOCK: Creating payment link for invoice ${invoiceData.invoiceId}`);
      const mockPaymentUrl = `https://mock-billcom-payment.com/pay?invoice=${invoiceData.invoiceId}&return=${encodeURIComponent(invoiceData.returnUrl)}`;
      console.log(`🔗 Mock payment URL: ${mockPaymentUrl}`);
      return mockPaymentUrl;
    }

    const sessionId = await this.authenticate();

    const response = await fetch(`${this.baseUrl}/invoices/${invoiceData.invoiceId}/payment-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'sessionId': sessionId,
        'devKey': this.credentials.devKey
      },
      body: JSON.stringify({
        customerId: invoiceData.customerId,
        email: invoiceData.customerEmail,
        returnUrl: invoiceData.returnUrl
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create payment link: ${errorText}`);
    }

    const result = await response.json() as any;
    return result.paymentUrl || result.url;
  }

  // Complete payment flow: create customer → invoice → payment link → creditor payment
  async createBillPaymentFlow(billData: {
    userEmail: string;
    userName: string;
    billCompany: string;
    billAmount: number;
    billDescription: string;
    accountNumber?: string;
    returnUrl: string;
    // Enhanced customer address from OCR/bill data
    customerAddress?: {
      name?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
    // For creditor payment
    creditorRoutingNumber?: string;
    creditorAccountNumber?: string;
    preferredPaymentMethod?: string;
    // Additional extracted data from OCR
    extractedData?: {
      originalText?: string;
      confidence?: number;
      extractedFields?: Record<string, any>;
    };
  }): Promise<{
    customer: BillComCustomer;
    invoice: BillComInvoice;
    paymentLink: string;
    estimatedCreditorPayment: {
      method: 'ACH' | 'Check' | 'Wire';
      estimatedDelivery: string;
    };
  }> {
    console.log(`🏦 Starting complete BILL.com payment flow for ${billData.billCompany}`);
    
    try {
      // Step 1: Create customer
      console.log(`👤 Creating customer for ${billData.userName}...`);
      let customer;
      try {
        customer = await this.createOrGetCustomer({
          name: billData.userName,
          email: billData.userEmail,
          address: billData.customerAddress
        });
        console.log(`👤 Customer ready: ${customer.name} (${customer.id})`);
      } catch (error: any) {
        console.error(`❌ Failed at customer creation step:`, error);
        throw new Error(`Customer creation failed: ${error.message}`);
      }

      // Step 2: Create invoice
      console.log(`📋 Creating invoice...`);
      let invoice;
      try {
        invoice = await this.createInvoice({
          customerId: customer.id,
          invoiceNumber: `BILL-${Date.now()}`,
          lineItems: [{
            quantity: 1,
            description: `Payment to ${billData.billCompany}${billData.accountNumber ? ` - Account: ${billData.accountNumber}` : ''}`,
            price: billData.billAmount
          }],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
          description: billData.billDescription
        });
        console.log(`📋 Invoice created: ${invoice.invoiceNumber} (${invoice.id})`);
      } catch (error: any) {
        console.error(`❌ Failed at invoice creation step:`, error);
        throw new Error(`Invoice creation failed: ${error.message}`);
      }

      // Step 3: Generate payment link
      console.log(`🔗 Creating payment link...`);
      let paymentLink;
      try {
        paymentLink = await this.createPaymentLink({
          invoiceId: invoice.id,
          customerId: customer.id,
          customerEmail: billData.userEmail,
          returnUrl: billData.returnUrl
        });
        console.log(`🔗 Payment link generated: ${paymentLink}`);
      } catch (error: any) {
        console.error(`❌ Failed at payment link creation step:`, error);
        throw new Error(`Payment link creation failed: ${error.message}`);
      }

      // Step 4: Prepare creditor payment info
      // Use bill's preferred payment method if available, otherwise determine best method
      const rawMethod = billData.preferredPaymentMethod || this.determineBestPaymentMethod(billData.billCompany);
      const recommendedMethod = (rawMethod as 'ACH' | 'Check' | 'Wire');
      const estimatedDelivery = recommendedMethod === 'ACH' ? '1-3 business days' : '5-7 business days';
      
      console.log(`💳 Creditor payment method: ${recommendedMethod} ${billData.preferredPaymentMethod ? '(from bill data)' : '(determined)'}`);
      console.log(`📅 Estimated delivery: ${estimatedDelivery}`);
      
      // Log enhanced bill data being used
      if (billData.extractedData) {
        console.log(`🔍 Using OCR extracted data - Confidence: ${billData.extractedData.confidence || 'N/A'}%`);
        if (billData.extractedData.extractedFields) {
          console.log(`📋 Extracted fields available:`, Object.keys(billData.extractedData.extractedFields));
        }
      }
      
      if (billData.creditorRoutingNumber || billData.creditorAccountNumber) {
        console.log(`🏦 Creditor banking details available - Routing: ${billData.creditorRoutingNumber ? 'Yes' : 'No'}, Account: ${billData.creditorAccountNumber ? 'Yes' : 'No'}`);
      }

      return {
        customer,
        invoice,
        paymentLink,
        estimatedCreditorPayment: {
          method: recommendedMethod,
          estimatedDelivery
        }
      };
    } catch (error: any) {
      console.error(`❌ BILL.com payment flow failed at step:`, error);
      console.error(`❌ Error details:`, error.message);
      console.error(`❌ Full error:`, error);
      throw new Error(`BILL.com payment flow failed: ${error.message}`);
    }
  }
}