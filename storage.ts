import { users, candidates, employees, attendance, leaves, type User, type InsertUser, type Candidate, type InsertCandidate, type Employee, type InsertEmployee, type Attendance, type InsertAttendance, type Leave, type InsertLeave } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Candidate methods
  getCandidates(): Promise<Candidate[]>;
  getCandidate(id: number): Promise<Candidate | undefined>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate>;
  deleteCandidate(id: number): Promise<void>;

  // Employee methods
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: number): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: number): Promise<void>;
  promoteCandidate(candidateId: number, employeeData: Omit<InsertEmployee, 'candidateId'>): Promise<Employee>;

  // Attendance methods
  getAttendance(): Promise<(Attendance & { employee: Employee })[]>;
  getAttendanceByEmployee(employeeId: number): Promise<Attendance[]>;
  createAttendance(attendanceData: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendanceData: Partial<InsertAttendance>): Promise<Attendance>;

  // Leave methods
  getLeaves(): Promise<(Leave & { employee: Employee })[]>;
  getLeavesByEmployee(employeeId: number): Promise<Leave[]>;
  getApprovedLeaves(): Promise<(Leave & { employee: Employee })[]>;
  createLeave(leave: InsertLeave): Promise<Leave>;
  updateLeave(id: number, leave: Partial<InsertLeave>): Promise<Leave>;
  deleteLeave(id: number): Promise<void>;

  sessionStore: session.SessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Candidate methods
  async getCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates).orderBy(desc(candidates.createdAt));
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    return candidate || undefined;
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db
      .insert(candidates)
      .values(candidate)
      .returning();
    return newCandidate;
  }

  async updateCandidate(id: number, candidate: Partial<InsertCandidate>): Promise<Candidate> {
    const [updatedCandidate] = await db
      .update(candidates)
      .set(candidate)
      .where(eq(candidates.id, id))
      .returning();
    return updatedCandidate;
  }

  async deleteCandidate(id: number): Promise<void> {
    await db.delete(candidates).where(eq(candidates.id, id));
  }

  // Employee methods
  async getEmployees(): Promise<Employee[]> {
    return await db.select().from(employees).orderBy(desc(employees.createdAt));
  }

  async getEmployee(id: number): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || undefined;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db
      .insert(employees)
      .values(employee)
      .returning();
    return newEmployee;
  }

  async updateEmployee(id: number, employee: Partial<InsertEmployee>): Promise<Employee> {
    const [updatedEmployee] = await db
      .update(employees)
      .set(employee)
      .where(eq(employees.id, id))
      .returning();
    return updatedEmployee;
  }

  async deleteEmployee(id: number): Promise<void> {
    await db.delete(employees).where(eq(employees.id, id));
  }

  async promoteCandidate(candidateId: number, employeeData: Omit<InsertEmployee, 'candidateId'>): Promise<Employee> {
    const [newEmployee] = await db
      .insert(employees)
      .values({ ...employeeData, candidateId })
      .returning();
    return newEmployee;
  }

  // Attendance methods
  async getAttendance(): Promise<(Attendance & { employee: Employee })[]> {
    return await db
      .select({
        id: attendance.id,
        employeeId: attendance.employeeId,
        date: attendance.date,
        status: attendance.status,
        task: attendance.task,
        createdAt: attendance.createdAt,
        employee: employees
      })
      .from(attendance)
      .innerJoin(employees, eq(attendance.employeeId, employees.id))
      .orderBy(desc(attendance.date));
  }

  async getAttendanceByEmployee(employeeId: number): Promise<Attendance[]> {
    return await db.select().from(attendance).where(eq(attendance.employeeId, employeeId));
  }

  async createAttendance(attendanceData: InsertAttendance): Promise<Attendance> {
    const [newAttendance] = await db
      .insert(attendance)
      .values(attendanceData)
      .returning();
    return newAttendance;
  }

  async updateAttendance(id: number, attendanceData: Partial<InsertAttendance>): Promise<Attendance> {
    const [updatedAttendance] = await db
      .update(attendance)
      .set(attendanceData)
      .where(eq(attendance.id, id))
      .returning();
    return updatedAttendance;
  }

  // Leave methods
  async getLeaves(): Promise<(Leave & { employee: Employee })[]> {
    return await db
      .select({
        id: leaves.id,
        employeeId: leaves.employeeId,
        startDate: leaves.startDate,
        endDate: leaves.endDate,
        reason: leaves.reason,
        status: leaves.status,
        designation: leaves.designation,
        documentsUrl: leaves.documentsUrl,
        createdAt: leaves.createdAt,
        employee: employees
      })
      .from(leaves)
      .innerJoin(employees, eq(leaves.employeeId, employees.id))
      .orderBy(desc(leaves.createdAt));
  }

  async getLeavesByEmployee(employeeId: number): Promise<Leave[]> {
    return await db.select().from(leaves).where(eq(leaves.employeeId, employeeId));
  }

  async getApprovedLeaves(): Promise<(Leave & { employee: Employee })[]> {
    return await db
      .select({
        id: leaves.id,
        employeeId: leaves.employeeId,
        startDate: leaves.startDate,
        endDate: leaves.endDate,
        reason: leaves.reason,
        status: leaves.status,
        designation: leaves.designation,
        documentsUrl: leaves.documentsUrl,
        createdAt: leaves.createdAt,
        employee: employees
      })
      .from(leaves)
      .innerJoin(employees, eq(leaves.employeeId, employees.id))
      .where(eq(leaves.status, "approved"))
      .orderBy(desc(leaves.startDate));
  }

  async createLeave(leave: InsertLeave): Promise<Leave> {
    const [newLeave] = await db
      .insert(leaves)
      .values(leave)
      .returning();
    return newLeave;
  }

  async updateLeave(id: number, leave: Partial<InsertLeave>): Promise<Leave> {
    const [updatedLeave] = await db
      .update(leaves)
      .set(leave)
      .where(eq(leaves.id, id))
      .returning();
    return updatedLeave;
  }

  async deleteLeave(id: number): Promise<void> {
    await db.delete(leaves).where(eq(leaves.id, id));
  }
}

export const storage = new DatabaseStorage();
