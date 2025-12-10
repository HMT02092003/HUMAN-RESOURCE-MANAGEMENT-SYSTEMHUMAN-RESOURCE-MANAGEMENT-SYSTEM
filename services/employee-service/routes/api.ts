/**
 * Employee Service API Routes v2.0 - Optimized with Dynamic Registration
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../src/middleware/authenticateToken';
import {
  getAllChevrons,
  getAllChevronsList,
  createChevron,
  getChevronDetail,
  updateChevron,
  deleteChevron,
  deleteMultipleChevrons
} from '@/src/controller/ChevronController';
import {
  getAllDepartments,
  getAllDepartmentsList,
  createDepartment,
  deleteMultipleDepartments,
  getDepartmentDetail,
  updateDepartment,
  deleteDepartment,
} from '@/src/controller/DepartmentController';
import {
  getAllContractTypes,
  getAllContractTypesList,
  createContractType,
  getContractTypeDetail,
  updateContractType,
  deleteMultipleContractTypes,
  deleteContractType,
} from '@/src/controller/ContractTypeController';
import { createContract, getContractsByUser, deleteContractsByUser, getActiveContract } from '@/src/controller/ContractController';

const router = Router();

// ===================================
// ROUTE DEFINITIONS
// ===================================
const routeGroups = [
  // CHEVRONS
  {
    group: 'chevrons',
    routes: [
      // Paginated list (server-side search/sort/pagination)
      { method: 'get', path: '/chevrons', handler: getAllChevrons, auth: true },
    // Full list for selects (returns plain array) - canonical leading prefix '/all/chevrons'
  { method: 'get', path: '/all/chevrons', handler: getAllChevronsList, auth: true },
      { method: 'post', path: '/createChevrons', handler: createChevron, auth: true },
      { method: 'post', path: '/getChevronDetail', handler: getChevronDetail, auth: false }, // Internal call
      { method: 'put', path: '/updateChevron', handler: updateChevron, auth: true },
      { method: 'delete', path: '/deleteChevron', handler: deleteChevron, auth: true },
      { method: 'delete', path: '/deleteMultipleChevrons', handler: deleteMultipleChevrons, auth: true },
    ]
  },

  // DEPARTMENTS
  {
    group: 'departments',
    routes: [
    { method: 'get', path: '/departments', handler: getAllDepartments, auth: true },
  // Full list for selects (returns plain array) - canonical leading prefix '/all/departments'
  { method: 'get', path: '/all/departments', handler: getAllDepartmentsList, auth: true },
      { method: 'post', path: '/createDepartments', handler: createDepartment, auth: true },
      { method: 'get', path: '/departments/:id', handler: getDepartmentDetail, auth: false }, // Internal call
      { method: 'put', path: '/departments', handler: updateDepartment, auth: true },
      { method: 'delete', path: '/deleteMultipleDepartments', handler: deleteMultipleDepartments, auth: true },
      { method: 'delete', path: '/deleteDepartment', handler: deleteDepartment, auth: true },
    ]
  },
  // CONTRACT TYPES
  {
    group: 'contract-types',
    routes: [
    { method: 'get', path: '/contractTypes', handler: getAllContractTypes, auth: true },
  // Full list for selects (returns plain array) - canonical leading prefix '/all/contractTypes'
  { method: 'get', path: '/all/contractTypes', handler: getAllContractTypesList, auth: true },
      { method: 'post', path: '/createContractType', handler: createContractType, auth: true },
      { method: 'get', path: '/contractTypes/:id', handler: getContractTypeDetail, auth: true },
      { method: 'put', path: '/contractTypes', handler: updateContractType, auth: true },
      { method: 'delete', path: '/deleteMultipleContractTypes', handler: deleteMultipleContractTypes, auth: true },
      { method: 'delete', path: '/deleteContractType', handler: deleteContractType, auth: true },
    ]
  },
  // CONTRACTS
  {
    group: 'contracts',
    routes: [
      { method: 'post', path: '/users/:userId/contracts', handler: createContract, auth: true },

      { method: 'get', path: '/contracts/user/:userId', handler: getContractsByUser, auth: true },
      { method: 'get', path: '/contracts/user/:userId/active', handler: getActiveContract, auth: false }, // For cross-service call
      { method: 'delete', path: '/contracts/user/:userId', handler: deleteContractsByUser, auth: true },
    ]
  }
];

// ===================================
// DYNAMIC ROUTE REGISTRATION
// ===================================
const registerRoutes = (groups: any[]) => {
  groups.forEach(({ group, routes }) => {
    routes.forEach((route: any) => {
      const middlewares: any[] = [];

      // Add authentication middleware if required
      if (route.auth) {
        middlewares.push(authenticateToken);
      }

      // Register route handler with error handling. Avoid noisy per-request registration logs;
      // instead we log registration once at startup below. The request-level logging is
      // handled by the server's middleware which prints timestamp + method + URL.
      middlewares.push(async (req: Request, res: Response) => {
        try {
          await route.handler(req, res);
        } catch (error) {
          console.error(`Error in ${group}.${route.handler.name}:`, error);
          res.status(500).json({
            error: 'Internal server error',
            group,
            endpoint: `${route.method.toUpperCase()} ${route.path}`,
            timestamp: new Date().toISOString()
          });
        }
      });
      // Register route
      (router as any)[route.method](route.path, ...middlewares);
    });
  });
};

// Register all routes
registerRoutes(routeGroups);

// ===================================
// API INFO ENDPOINT
// ===================================
router.get('/', (req: Request, res: Response) => {
  const totalRoutes = routeGroups.reduce((sum, group) => sum + group.routes.length, 0);

  const apiInfo = {
    service: 'Employee Service API v2.0',
    status: 'active',
    totalRoutes,
    routeGroups: routeGroups.map(({ group, routes }) => ({
      group,
      endpoints: routes.length,
      routes: routes.map(route => ({
        method: route.method.toUpperCase(),
        path: route.path,
        auth: route.auth
      }))
    })),
    timestamp: new Date().toISOString()
  };

  res.json(apiInfo);
});

export default router;


