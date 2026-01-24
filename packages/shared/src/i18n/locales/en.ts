/**
 * English translations for TeilFair
 * This is the source of truth for all translatable strings
 */
const en = {
  // Common strings used across the app
  common: {
    appName: 'TeilFair',
    tagline: 'Split expenses fairly',
    loading: 'Loading...',
    error: 'Error',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    close: 'Close',
    copy: 'Copy',
    copied: 'Copied!',
    open: 'Open',
    remove: 'Remove',
    lastUpdated: 'Updated {{date}}',
    back: 'Back',
    goBack: 'Go Back',
    goHome: 'Go Home',
    share: 'Share',
    total: 'Total',
    unknown: 'Unknown',
    today: 'Today',
    yesterday: 'Yesterday',
    daysAgo: '{{count}} days ago',
    at: 'at',
    fullAccess: 'full access',
    viewOnly: 'view only',
    editPermission: 'edit',
    viewPermission: 'view',
  },

  // Theme related
  theme: {
    light: 'Light',
    dark: 'Dark',
    switchTo: 'Switch to {{mode}} Mode',
    currentMode: 'Current mode: {{mode}}',
  },

  // Currency names
  currency: {
    EUR: 'EUR - Euro',
    USD: 'USD - US Dollar',
    GBP: 'GBP - British Pound',
    CHF: 'CHF - Swiss Franc',
    JPY: 'JPY - Japanese Yen',
    CAD: 'CAD - Canadian Dollar',
    AUD: 'AUD - Australian Dollar',
    SEK: 'SEK - Swedish Krona',
    NOK: 'NOK - Norwegian Krone',
    DKK: 'DKK - Danish Krone',
    PLN: 'PLN - Polish Zloty',
    CZK: 'CZK - Czech Koruna',
  },

  // Home page
  home: {
    heroTitle: 'Split expenses,\nstay fair',
    heroSubtitle: 'Track shared expenses with friends. No sign-up needed, just create and share.',
    createGroup: 'Create Group',
    joinGroup: 'Join Group',
    
    // Create form
    createFormTitle: 'Create New Group',
    groupNameLabel: 'Group Name',
    groupNamePlaceholder: 'e.g., Trip to Paris, Roommates, Dinner Club',
    currencyLabel: 'Currency',
    createButton: 'Create Group',
    creating: 'Creating...',
    
    // Join form
    joinFormTitle: 'Join Existing Group',
    linkLabel: 'Group Link',
    linkPlaceholder: 'Paste the shared group link here...',
    linkHint: 'Ask your friend for the group link they received when creating the group.',
    joinButton: 'Join Group',
    joining: 'Joining...',
    
    // Recent groups
    recentGroupsTitle: 'Your Groups',
    recentGroupsTitleMobile: 'Recent Groups',
    
    // How it works
    howItWorksTitle: 'How it works',
    step1Title: 'Create & Share',
    step1Description: 'Start a group and invite friends with a simple link. No accounts needed.',
    step2Title: 'Log Expenses',
    step2Description: 'Add expenses as they happen. Support for multiple payers and custom splits.',
    step3Title: 'See Balances',
    step3Description: 'Instantly see who owes whom with automatic calculations.',
    step4Title: 'Settle Up',
    step4Description: 'Get optimized payment suggestions to minimize transactions.',
    
    // Mobile how it works (simpler)
    howItWorksStep1: 'Create a group and share the link with friends',
    howItWorksStep2: 'Add expenses as they happen',
    howItWorksStep3: 'Split costs equally or with custom amounts',
    howItWorksStep4: 'See who owes whom and settle up',
  },

  // Group page
  group: {
    // Tabs
    tabExpenses: 'Expenses',
    tabBalances: 'Balances',
    tabMembers: 'Members',
    tabMembersCount: 'Members ({{count}})',
    
    // Header stats
    expenseCount: '{{count}} expense',
    expenseCount_plural: '{{count}} expenses',
    memberCount: '{{count}} member',
    memberCount_plural: '{{count}} members',
    totalExpenses: 'Total Expenses',
    summary: 'Summary',
    
    // States
    loadingGroup: 'Loading group...',
    groupNotFoundTitle: 'Group Not Found',
    groupNotFoundDescription: "This group doesn't exist or you don't have access.",
    invalidLinkTitle: 'Invalid Link',
    invalidLinkDescription: 'This group link is invalid or incomplete.',
  },

  // Expense related
  expense: {
    addExpense: 'Add Expense',
    editExpense: 'Edit Expense',
    viewExpense: 'Expense Details',
    viewDetails: 'View details',
    adding: 'Adding...',
    saving: 'Saving...',
    deleting: 'Deleting...',
    saveChanges: 'Save Changes',
    defaultDescription: 'Expense',
    
    // Form
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'e.g., Dinner, Taxi, Hotel',
    amountLabel: 'Amount ({{currency}})',
    amountPlaceholder: '0.00',
    dateLabel: 'Date',
    timeLabel: 'Time',
    dateTimeLabel: 'Date & Time',
    whoPaidLabel: 'Who paid?',
    selectPayer: 'Select payer...',
    multiplePayers: 'Multiple payers',
    singlePayer: 'Single payer',
    useMultiplePayers: '+ Multiple payers',
    useSinglePayer: '- Use single payer',
    totalEntered: 'Total entered:',
    splitBetweenLabel: 'Split between',
    splitBetweenCount: 'Split between ({{count}} {{unit}})',
    person: 'person',
    people: 'people',
    customSplitAmounts: 'Custom split amounts',
    equalSplit: 'Equal split',
    useCustomSplit: '+ Custom split amounts',
    useEqualSplit: '- Use equal split',
    
    // List
    paidBy: 'Paid by {{names}}',
    splitEqually: 'Split equally',
    splitBetween: 'Split between {{count}} people',
    
    // Empty state
    emptyTitle: 'No expenses yet',
    emptyDescription: 'Add an expense to start tracking',
    emptyDescriptionReadOnly: 'No expenses have been added yet',
    emptyDescriptionWithWrite: 'Add your first expense to get started',
    
    // Confirm delete
    confirmDelete: 'Are you sure you want to delete this expense?',
    confirmDeleteTitle: 'Delete Expense',
  },

  // Member related
  member: {
    addMember: 'Add',
    addMemberLabel: 'Add new member',
    addMembersFirst: 'Add Members First',
    addMembersFirstDescription: 'You need at least one member to create an expense',
    memberNamePlaceholder: 'Enter member name...',
    newMemberPlaceholder: 'Enter name...',
    newMemberPlaceholderMobile: 'New member name',
    addNewMemberPlaceholder: 'Add new member...',
    editNameTitle: 'Edit name',
    deleteTitle: 'Delete member',
    
    // Empty state
    emptyTitle: 'No members yet',
    emptyDescriptionWithWrite: 'Add members to start splitting expenses',
    
    // Confirm delete
    confirmDelete: 'Are you sure you want to delete this member?',
    confirmDeleteNamed: 'Are you sure you want to delete {{name}}?',
    cannotDelete: 'Cannot delete a member who is part of an expense. Remove them from all expenses first.',
    
    // Labels
    membersLabel: 'Members',
    addMemberHint: 'Add at least 2 members to start adding expenses',
    addMemberHintSingle: 'Add at least one member to create an expense',
    addMembersToTrack: 'Add members first to start tracking expenses',
    goToMembers: 'Go to Members',
  },

  // Balance related
  balance: {
    individualBalances: 'Individual Balances',
    suggestedSettlements: 'Suggested Settlements',
    settlementsDescription: 'These payments will settle all debts with minimum transactions',
    getsBack: 'gets back',
    owes: 'owes',
    settled: 'settled',
    allSettledUp: 'All settled up!',
    noPaymentsNeeded: 'No payments needed',
    
    // Empty state
    emptyTitle: 'No balances yet',
    emptyDescription: 'Add expenses to see who owes whom',
  },

  // Share modal
  share: {
    title: 'Share Group',
    description: 'Share these links to invite others to "{{groupName}}". Anyone with the link can access it.',
    viewOnlyLinkLabel: 'View-only Link',
    viewOnlyBadge: 'view only',
    viewOnlyDescription: 'Recipients can view expenses and balances but cannot make changes.',
    fullAccessLinkLabel: 'Full Access Link',
    fullAccessBadge: 'full access',
    fullAccessDescription: 'Recipients can add members, create expenses, and edit the group.',
    securityNoteTitle: 'Security note:',
    securityNoteDescription: 'These links never expire. Only share with people you trust.',
    securityWriteWarning: 'The full access link gives permission to modify the group.',
    
    // Mobile share dialog
    sharePromptTitle: 'Share Group',
    sharePromptDescription: 'Which link would you like to share?',
    shareViewOnly: 'View Only',
    shareEditAccess: 'Edit Access',
    
    // Share messages
    shareMessageViewOnly: 'Join my TeilFair group "{{groupName}}" (view only):\n{{url}}',
    shareMessageEditAccess: 'Join my TeilFair group "{{groupName}}" (can edit):\n{{url}}',
    shareMessageDefault: 'Join my TeilFair group "{{groupName}}":\n{{url}}',
  },

  // Error messages
  error: {
    generic: 'An error occurred',
    failedToCreate: 'Failed to create group',
    failedToJoin: 'Could not access group. Invalid link or token.',
    failedToAddMember: 'Failed to add member',
    failedToAddExpense: 'Failed to add expense',
    failedToUpdateExpense: 'Failed to update expense',
    invalidLink: 'Invalid group link',
    invalidLinkFormat: 'Invalid link format',
    groupNoLongerAccessible: 'This group is no longer accessible',
    expenseNotFound: 'Expense not found',
    groupNotFound: 'Group not found',
    invalidTokenOrGroup: 'Invalid token or group not found',
    noGroupLoaded: 'No group loaded',
    failedToLoadGroup: 'Failed to load group',
    failedToCreateGroup: 'Failed to create group',
  },

  // Validation messages
  validation: {
    enterValidAmount: 'Please enter a valid amount',
    selectAtLeastOnePerson: 'Please select at least one person to split with',
    enterPaymentAmounts: 'Please enter payment amounts',
    paidAmountsMismatch: "Paid amounts ({{paid}}) don't match total ({{total}})",
    selectWhoPaid: 'Please select who paid',
    enterSplitAmounts: 'Please enter split amounts for at least one person',
    enterSplitAmountsShort: 'Please enter split amounts',
    splitAmountsMismatch: "Split amounts ({{split}}) don't match total ({{total}})",
    enterGroupName: 'Please enter a group name',
    percentageExceeds100: 'Percentage splits cannot exceed 100%',
    fixedExceedsTotal: 'Fixed splits cannot exceed total amount',
    splitsMustCoverTotal: 'Splits must cover the entire amount when no ratio splits are used',
  },

  // Accessibility labels
  accessibility: {
    backToHome: 'Back to home',
    themeToggle: 'Theme: {{mode}}',
    languageSelector: 'Select language',
  },
} as const;

export default en;

// Type helper for nested translation keys
export type TranslationKeys = typeof en;
