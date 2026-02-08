import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const OWNER_EMAIL = process.env.KARATU_OWNER_EMAIL ?? "owner@karatuhotels.co.tz";
const OWNER_PASSWORD = process.env.KARATU_OWNER_PASSWORD ?? "KaratuHotels#2026!";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

function addMonths(date, months) {
  const copy = new Date(date);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  return copy;
}

async function ensureOwnerUser() {
  const { data: userListData, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw listError;
  }

  const existing = userListData.users.find((user) => user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase());

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: OWNER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: "Karatu Hotels Owner",
      },
    });

    if (updateError) {
      throw updateError;
    }

    return existing.id;
  }

  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: "Karatu Hotels Owner",
    },
  });

  if (createError) {
    throw createError;
  }

  if (!createData.user) {
    throw new Error("Failed to create owner user");
  }

  return createData.user.id;
}

async function ensureCompany() {
  const legalName = "Karatu Hotels Limited";

  const { data: existingCompany, error: existingError } = await supabase
    .from("companies")
    .select("id")
    .eq("legal_name", legalName)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existingCompany) {
    return existingCompany.id;
  }

  const { data: company, error: insertError } = await supabase
    .from("companies")
    .insert({
      legal_name: legalName,
      trade_name: "Karatu Hotels",
      country_code: "TZ",
      currency_code: "TZS",
      timezone: "Africa/Dar_es_Salaam",
      is_active: true,
    })
    .select("id")
    .single();

  if (insertError || !company) {
    throw insertError ?? new Error("Failed to create company");
  }

  return company.id;
}

async function ensureMembership(ownerUserId, companyId) {
  const { error: membershipError } = await supabase.from("company_memberships").upsert(
    {
      company_id: companyId,
      user_id: ownerUserId,
      role: "owner",
      is_active: true,
    },
    {
      onConflict: "company_id,user_id",
    },
  );

  if (membershipError) {
    throw membershipError;
  }

  const { error: profileError } = await supabase.from("user_profiles").upsert(
    {
      user_id: ownerUserId,
      full_name: "Karatu Hotels Owner",
      phone: "+255755100001",
    },
    {
      onConflict: "user_id",
    },
  );

  if (profileError) {
    throw profileError;
  }
}

async function seedReferenceData(companyId) {
  const { data: earningTypes, error: earningError } = await supabase
    .from("earning_types")
    .upsert(
      [
        { company_id: companyId, code: "HOUSING_ALLOWANCE", name: "Housing Allowance", is_taxable: true, is_statutory: false },
        { company_id: companyId, code: "TRANSPORT_ALLOWANCE", name: "Transport Allowance", is_taxable: true, is_statutory: false },
        { company_id: companyId, code: "OVERTIME", name: "Overtime", is_taxable: true, is_statutory: false },
        { company_id: companyId, code: "BONUS", name: "Bonus", is_taxable: true, is_statutory: false },
      ],
      { onConflict: "company_id,code" },
    )
    .select("id, code");

  if (earningError) {
    throw earningError;
  }

  const { data: deductionTypes, error: deductionError } = await supabase
    .from("deduction_types")
    .upsert(
      [
        { company_id: companyId, code: "PAYE", name: "PAYE", is_pre_tax: false, is_statutory: true },
        { company_id: companyId, code: "NSSF_EMPLOYEE", name: "NSSF Employee", is_pre_tax: true, is_statutory: true },
        { company_id: companyId, code: "LOAN_ADVANCE", name: "Loan/Advance", is_pre_tax: false, is_statutory: false },
      ],
      { onConflict: "company_id,code" },
    )
    .select("id, code");

  if (deductionError) {
    throw deductionError;
  }

  const { data: leavePolicies, error: leaveError } = await supabase
    .from("leave_policies")
    .upsert(
      [
        { company_id: companyId, code: "ANNUAL", name: "Annual Leave", accrual_days_per_year: 28, is_paid: true },
        { company_id: companyId, code: "SICK", name: "Sick Leave", accrual_days_per_year: 14, is_paid: true },
        { company_id: companyId, code: "MATERNITY", name: "Maternity Leave", accrual_days_per_year: 84, is_paid: true },
        { company_id: companyId, code: "PATERNITY", name: "Paternity Leave", accrual_days_per_year: 7, is_paid: true },
        { company_id: companyId, code: "UNPAID", name: "Unpaid Leave", accrual_days_per_year: 0, is_paid: false },
      ],
      { onConflict: "company_id,code" },
    )
    .select("id, code");

  if (leaveError) {
    throw leaveError;
  }

  return {
    earningTypeMap: new Map(earningTypes.map((item) => [item.code, item.id])),
    deductionTypeMap: new Map(deductionTypes.map((item) => [item.code, item.id])),
    leavePolicyMap: new Map(leavePolicies.map((item) => [item.code, item.id])),
  };
}

async function seedEmployees(companyId, refs) {
  const employees = [
    {
      employee_no: "KH-001",
      first_name: "John",
      last_name: "Mrema",
      work_email: "john.mrema@karatuhotels.co.tz",
      phone: "+255754110001",
      hire_date: "2022-03-01",
      job_title: "General Manager",
      department: "Management",
      basic_salary: 4800000,
      housing_allowance: 700000,
      transport_allowance: 250000,
      paye: 970000,
      nssf: 384000,
      loan: 0,
      annual_leave_balance: 23,
    },
    {
      employee_no: "KH-002",
      first_name: "Asha",
      last_name: "Mtei",
      work_email: "asha.mtei@karatuhotels.co.tz",
      phone: "+255754110002",
      hire_date: "2023-01-09",
      job_title: "HR Manager",
      department: "HR",
      basic_salary: 2700000,
      housing_allowance: 350000,
      transport_allowance: 180000,
      paye: 405000,
      nssf: 216000,
      loan: 0,
      annual_leave_balance: 20,
    },
    {
      employee_no: "KH-003",
      first_name: "Kelvin",
      last_name: "Magori",
      work_email: "kelvin.magori@karatuhotels.co.tz",
      phone: "+255754110003",
      hire_date: "2023-06-12",
      job_title: "Finance Officer",
      department: "Finance",
      basic_salary: 2400000,
      housing_allowance: 300000,
      transport_allowance: 160000,
      paye: 338000,
      nssf: 192000,
      loan: 85000,
      annual_leave_balance: 19,
    },
    {
      employee_no: "KH-004",
      first_name: "Neema",
      last_name: "Nnko",
      work_email: "neema.nnko@karatuhotels.co.tz",
      phone: "+255754110004",
      hire_date: "2024-02-03",
      job_title: "Front Desk Supervisor",
      department: "Front Office",
      basic_salary: 1600000,
      housing_allowance: 180000,
      transport_allowance: 120000,
      paye: 160000,
      nssf: 128000,
      loan: 0,
      annual_leave_balance: 18,
    },
    {
      employee_no: "KH-005",
      first_name: "Omary",
      last_name: "Ally",
      work_email: "omary.ally@karatuhotels.co.tz",
      phone: "+255754110005",
      hire_date: "2024-05-15",
      job_title: "Front Desk Agent",
      department: "Front Office",
      basic_salary: 980000,
      housing_allowance: 100000,
      transport_allowance: 70000,
      paye: 52000,
      nssf: 78400,
      loan: 0,
      annual_leave_balance: 16,
    },
    {
      employee_no: "KH-006",
      first_name: "Joyce",
      last_name: "Mollel",
      work_email: "joyce.mollel@karatuhotels.co.tz",
      phone: "+255754110006",
      hire_date: "2023-10-10",
      job_title: "Housekeeping Supervisor",
      department: "Housekeeping",
      basic_salary: 1250000,
      housing_allowance: 120000,
      transport_allowance: 90000,
      paye: 98000,
      nssf: 100000,
      loan: 0,
      annual_leave_balance: 17,
    },
    {
      employee_no: "KH-007",
      first_name: "Emmanuel",
      last_name: "Lema",
      work_email: "emmanuel.lema@karatuhotels.co.tz",
      phone: "+255754110007",
      hire_date: "2022-08-18",
      job_title: "Head Chef",
      department: "Kitchen",
      basic_salary: 1850000,
      housing_allowance: 220000,
      transport_allowance: 130000,
      paye: 220000,
      nssf: 148000,
      loan: 0,
      annual_leave_balance: 21,
    },
    {
      employee_no: "KH-008",
      first_name: "Faraja",
      last_name: "Mushi",
      work_email: "faraja.mushi@karatuhotels.co.tz",
      phone: "+255754110008",
      hire_date: "2023-11-21",
      job_title: "Sous Chef",
      department: "Kitchen",
      basic_salary: 1400000,
      housing_allowance: 140000,
      transport_allowance: 100000,
      paye: 125000,
      nssf: 112000,
      loan: 35000,
      annual_leave_balance: 16,
    },
    {
      employee_no: "KH-009",
      first_name: "Ibrahim",
      last_name: "Kessy",
      work_email: "ibrahim.kessy@karatuhotels.co.tz",
      phone: "+255754110009",
      hire_date: "2024-01-12",
      job_title: "Driver",
      department: "Transport",
      basic_salary: 900000,
      housing_allowance: 80000,
      transport_allowance: 60000,
      paye: 40000,
      nssf: 72000,
      loan: 0,
      annual_leave_balance: 15,
    },
    {
      employee_no: "KH-010",
      first_name: "Rehema",
      last_name: "Mollel",
      work_email: "rehema.mollel@karatuhotels.co.tz",
      phone: "+255754110010",
      hire_date: "2024-07-02",
      job_title: "Waitress",
      department: "Food & Beverage",
      basic_salary: 780000,
      housing_allowance: 70000,
      transport_allowance: 50000,
      paye: 28000,
      nssf: 62400,
      loan: 0,
      annual_leave_balance: 14,
    },
    {
      employee_no: "KH-011",
      first_name: "David",
      last_name: "Mshana",
      work_email: "david.mshana@karatuhotels.co.tz",
      phone: "+255754110011",
      hire_date: "2023-03-17",
      job_title: "Security Lead",
      department: "Security",
      basic_salary: 1050000,
      housing_allowance: 90000,
      transport_allowance: 75000,
      paye: 70000,
      nssf: 84000,
      loan: 0,
      annual_leave_balance: 18,
    },
    {
      employee_no: "KH-012",
      first_name: "Anna",
      last_name: "Nnko",
      work_email: "anna.nnko@karatuhotels.co.tz",
      phone: "+255754110012",
      hire_date: "2023-09-05",
      job_title: "Sales Coordinator",
      department: "Sales",
      basic_salary: 1500000,
      housing_allowance: 180000,
      transport_allowance: 120000,
      paye: 142000,
      nssf: 120000,
      loan: 0,
      annual_leave_balance: 20,
    },
  ];

  const { data: upsertedEmployees, error: employeeError } = await supabase
    .from("employees")
    .upsert(
      employees.map((employee, index) => ({
        company_id: companyId,
        employee_no: employee.employee_no,
        first_name: employee.first_name,
        last_name: employee.last_name,
        work_email: employee.work_email,
        phone: employee.phone,
        hire_date: employee.hire_date,
        employment_type: "permanent",
        tax_residency: "resident",
        is_primary_employment: true,
        payment_method: index % 4 === 0 ? "mobile_money" : "bank",
        bank_name: index % 4 === 0 ? null : "CRDB Bank",
        bank_account_no: index % 4 === 0 ? null : `0154${String(index + 1).padStart(8, "0")}`,
        mobile_money_provider: index % 4 === 0 ? "M-Pesa" : null,
        mobile_money_no: index % 4 === 0 ? employee.phone : null,
        tin: `100-200-${String(index + 1).padStart(3, "0")}`,
        nssf_no: `NSSF-KH-${String(index + 1).padStart(3, "0")}`,
        metadata: {
          department: employee.department,
          job_title: employee.job_title,
          work_location: "Karatu, Arusha",
        },
      })),
      { onConflict: "company_id,employee_no" },
    )
    .select("id, employee_no");

  if (employeeError) {
    throw employeeError;
  }

  const employeeIdByNo = new Map(upsertedEmployees.map((employee) => [employee.employee_no, employee.id]));
  const employeeIds = Array.from(employeeIdByNo.values());

  const { error: clearContractsError } = await supabase
    .from("employee_contracts")
    .delete()
    .eq("company_id", companyId)
    .in("employee_id", employeeIds);

  if (clearContractsError) {
    throw clearContractsError;
  }

  const { error: contractsError } = await supabase.from("employee_contracts").insert(
    employees.map((employee) => ({
      company_id: companyId,
      employee_id: employeeIdByNo.get(employee.employee_no),
      contract_type: "permanent",
      effective_from: employee.hire_date,
      basic_salary: employee.basic_salary,
      salary_frequency: "monthly",
      currency_code: "TZS",
      metadata: {
        payroll_group: "monthly",
      },
    })),
  );

  if (contractsError) {
    throw contractsError;
  }

  const housingAllowanceId = refs.earningTypeMap.get("HOUSING_ALLOWANCE");
  const transportAllowanceId = refs.earningTypeMap.get("TRANSPORT_ALLOWANCE");
  const payeId = refs.deductionTypeMap.get("PAYE");
  const nssfId = refs.deductionTypeMap.get("NSSF_EMPLOYEE");
  const loanId = refs.deductionTypeMap.get("LOAN_ADVANCE");

  const { error: clearEarningsError } = await supabase
    .from("employee_recurring_earnings")
    .delete()
    .eq("company_id", companyId)
    .in("employee_id", employeeIds);

  if (clearEarningsError) {
    throw clearEarningsError;
  }

  const earningRows = [];
  for (const employee of employees) {
    const employeeId = employeeIdByNo.get(employee.employee_no);
    if (!employeeId) continue;

    if (employee.housing_allowance > 0) {
      earningRows.push({
        company_id: companyId,
        employee_id: employeeId,
        earning_type_id: housingAllowanceId,
        amount: employee.housing_allowance,
        effective_from: employee.hire_date,
      });
    }

    if (employee.transport_allowance > 0) {
      earningRows.push({
        company_id: companyId,
        employee_id: employeeId,
        earning_type_id: transportAllowanceId,
        amount: employee.transport_allowance,
        effective_from: employee.hire_date,
      });
    }
  }

  if (earningRows.length) {
    const { error: insertEarningsError } = await supabase.from("employee_recurring_earnings").insert(earningRows);
    if (insertEarningsError) {
      throw insertEarningsError;
    }
  }

  const { error: clearDeductionsError } = await supabase
    .from("employee_recurring_deductions")
    .delete()
    .eq("company_id", companyId)
    .in("employee_id", employeeIds);

  if (clearDeductionsError) {
    throw clearDeductionsError;
  }

  const deductionRows = [];
  for (const employee of employees) {
    const employeeId = employeeIdByNo.get(employee.employee_no);
    if (!employeeId) continue;

    deductionRows.push({
      company_id: companyId,
      employee_id: employeeId,
      deduction_type_id: payeId,
      amount: employee.paye,
      effective_from: employee.hire_date,
    });

    deductionRows.push({
      company_id: companyId,
      employee_id: employeeId,
      deduction_type_id: nssfId,
      amount: employee.nssf,
      effective_from: employee.hire_date,
    });

    if (employee.loan > 0) {
      deductionRows.push({
        company_id: companyId,
        employee_id: employeeId,
        deduction_type_id: loanId,
        amount: employee.loan,
        effective_from: employee.hire_date,
      });
    }
  }

  const { error: deductionsError } = await supabase.from("employee_recurring_deductions").insert(deductionRows);
  if (deductionsError) {
    throw deductionsError;
  }

  const annualLeaveId = refs.leavePolicyMap.get("ANNUAL");
  if (!annualLeaveId) {
    throw new Error("Annual leave policy missing");
  }

  const { error: balancesError } = await supabase.from("leave_balances").upsert(
    employees.map((employee) => ({
      company_id: companyId,
      employee_id: employeeIdByNo.get(employee.employee_no),
      leave_policy_id: annualLeaveId,
      balance_days: employee.annual_leave_balance,
      as_of: ymd(new Date(Date.UTC(2026, 1, 1))),
    })),
    { onConflict: "employee_id,leave_policy_id,as_of" },
  );

  if (balancesError) {
    throw balancesError;
  }

  return { employeeCount: employees.length };
}

async function seedOperationalRows(companyId, ownerUserId) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const startsOn = ymd(new Date(Date.UTC(year, month - 1, 1)));
  const endsOn = ymd(new Date(Date.UTC(year, month, 0)));

  const { error: periodError } = await supabase.from("payroll_periods").upsert(
    {
      company_id: companyId,
      period_year: year,
      period_month: month,
      starts_on: startsOn,
      ends_on: endsOn,
      payment_date: ymd(new Date(Date.UTC(year, month, 0))),
      status: "open",
    },
    { onConflict: "company_id,period_year,period_month" },
  );

  if (periodError) {
    throw periodError;
  }

  const nextDue = ymd(new Date(Date.UTC(addMonths(now, 1).getUTCFullYear(), addMonths(now, 1).getUTCMonth(), 7)));

  const { error: reminderError } = await supabase.from("compliance_reminders").upsert(
    [
      {
        company_id: companyId,
        reminder_type: "SDL_MONTHLY_RETURN",
        due_date: nextDue,
        status: "open",
        related_entity_type: "payroll_period",
        related_entity_id: `${year}-${String(month).padStart(2, "0")}`,
      },
      {
        company_id: companyId,
        reminder_type: "PAYE_MONTHLY_RETURN",
        due_date: nextDue,
        status: "open",
        related_entity_type: "payroll_period",
        related_entity_id: `${year}-${String(month).padStart(2, "0")}`,
      },
    ],
    {
      onConflict: "company_id,reminder_type,due_date,related_entity_type,related_entity_id",
    },
  );

  if (reminderError) {
    throw reminderError;
  }

  const { error: auditError } = await supabase.from("audit_events").insert({
    company_id: companyId,
    actor_user_id: ownerUserId,
    action: "bootstrap.karatu_hotels.completed",
    entity_type: "company",
    entity_id: companyId,
    metadata: {
      seeded_by: "scripts/bootstrap-karatu-hotels.mjs",
    },
  });

  if (auditError) {
    throw auditError;
  }
}

async function main() {
  const ownerUserId = await ensureOwnerUser();
  const companyId = await ensureCompany();

  await ensureMembership(ownerUserId, companyId);

  const refs = await seedReferenceData(companyId);
  const seedResult = await seedEmployees(companyId, refs);
  await seedOperationalRows(companyId, ownerUserId);

  console.log("Bootstrap complete.");
  console.log(`Company: Karatu Hotels Limited (${companyId})`);
  console.log(`Owner Email: ${OWNER_EMAIL}`);
  console.log(`Owner Password: ${OWNER_PASSWORD}`);
  console.log(`Employees seeded: ${seedResult.employeeCount}`);
  console.log("Important: Change the owner password immediately after first login.");
}

main().catch((error) => {
  console.error("Bootstrap failed:", error.message ?? error);
  process.exit(1);
});
