// LLVM IR Code Generator for ALLM language

import * as AST from './ast.js';

export class CodeGenError extends Error {
  constructor(
    message: string,
    public line: number,
    public column: number
  ) {
    super(`Code generation error at ${line}:${column}: ${message}`);
    this.name = 'CodeGenError';
  }
}

interface Variable {
  llvmName: string;
  type: AST.Type;
  mutable: boolean;
}

interface FunctionInfo {
  params: AST.Parameter[];
  returnType: AST.Type;
  external: boolean;
}

interface StructInfo {
  fields: AST.StructField[];
  llvmType: string;
}

export class CodeGenerator {
  private output: string[] = [];
  private tempCounter: number = 0;
  private labelCounter: number = 0;
  private stringCounter: number = 0;
  private varCounter: number = 0;
  private strings: Map<string, string> = new Map();
  private functions: Map<string, FunctionInfo> = new Map();
  private structs: Map<string, StructInfo> = new Map();
  private currentFunction: string = '';
  private variables: Map<string, Variable> = new Map();

  generate(program: AST.Program): string {
    // First pass: collect function and struct declarations
    for (const decl of program.declarations) {
      if (decl.kind === 'function') {
        this.functions.set(decl.name, {
          params: decl.params,
          returnType: decl.returnType,
          external: decl.external,
        });
      } else if (decl.kind === 'struct') {
        this.registerStruct(decl);
      } else if (decl.kind === 'extern') {
        this.functions.set(decl.name, {
          params: decl.params,
          returnType: decl.returnType,
          external: true,
        });
      }
    }

    // Generate LLVM IR header
    this.emit('; ALLM Compiler Output');
    this.emit('target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"');
    this.emit('target triple = "x86_64-unknown-linux-gnu"');
    this.emit('');

    // Generate struct types
    for (const [name, info] of this.structs) {
      this.emit(`%${name} = type ${info.llvmType}`);
    }
    if (this.structs.size > 0) this.emit('');

    // Second pass: generate code
    for (const decl of program.declarations) {
      if (decl.kind === 'function') {
        this.generateFunction(decl);
      } else if (decl.kind === 'extern') {
        this.generateExtern(decl);
      }
    }

    // Generate string constants at the end
    if (this.strings.size > 0) {
      this.emit('');
      this.emit('; String constants');
      for (const [str, name] of this.strings) {
        const escaped = this.escapeString(str);
        const len = str.length + 1; // +1 for null terminator
        this.emit(`${name} = private unnamed_addr constant [${len} x i8] c"${escaped}\\00"`);
      }
    }

    return this.output.join('\n');
  }

  private registerStruct(decl: AST.StructDecl): void {
    const fieldTypes = decl.fields.map(f => this.typeToLLVM(f.type));
    const llvmType = `{ ${fieldTypes.join(', ')} }`;
    this.structs.set(decl.name, { fields: decl.fields, llvmType });
  }

  private generateExtern(decl: AST.ExternDecl): void {
    const params = decl.params.map(p => this.typeToLLVM(p.type)).join(', ');
    const retType = this.typeToLLVM(decl.returnType);
    this.emit(`declare ${retType} @${decl.name}(${params})`);
    this.emit('');
  }

  private generateFunction(fn: AST.FunctionDecl): void {
    this.currentFunction = fn.name;
    this.variables.clear();
    this.tempCounter = 0;
    this.varCounter = 0;

    const params = fn.params.map(p => `${this.typeToLLVM(p.type)} %${p.name}.arg`).join(', ');
    const retType = this.typeToLLVM(fn.returnType);

    this.emit(`define ${retType} @${fn.name}(${params}) {`);
    this.emit('entry:');

    // Allocate space for parameters and copy them
    for (const param of fn.params) {
      const llvmType = this.typeToLLVM(param.type);
      const uniqueId = this.varCounter++;
      const ptrName = `%${param.name}.${uniqueId}`;
      this.emit(`  ${ptrName} = alloca ${llvmType}`);
      this.emit(`  store ${llvmType} %${param.name}.arg, ptr ${ptrName}`);
      this.variables.set(param.name, {
        llvmName: ptrName,
        type: param.type,
        mutable: true,
      });
    }

    // Generate function body
    let hasReturn = false;
    for (const stmt of fn.body) {
      this.generateStmt(stmt);
      if (stmt.kind === 'return') {
        hasReturn = true;
      }
    }

    // Add implicit return for void functions
    if (!hasReturn) {
      if (fn.returnType.kind === 'void') {
        this.emit('  ret void');
      } else {
        // Error: non-void function missing return
        this.emit(`  ret ${retType} 0 ; WARNING: missing return`);
      }
    }

    this.emit('}');
    this.emit('');
  }

  private generateStmt(stmt: AST.Stmt): void {
    switch (stmt.kind) {
      case 'let':
        this.generateLet(stmt);
        break;
      case 'assign':
        this.generateAssign(stmt);
        break;
      case 'if':
        this.generateIf(stmt);
        break;
      case 'while':
        this.generateWhile(stmt);
        break;
      case 'for':
        this.generateFor(stmt);
        break;
      case 'return':
        this.generateReturn(stmt);
        break;
      case 'expr':
        this.generateExpr(stmt.expr);
        break;
    }
  }

  private generateLet(stmt: AST.LetStmt): void {
    const llvmType = this.typeToLLVM(stmt.type);
    const uniqueId = this.varCounter++;
    const ptrName = `%${stmt.name}.${uniqueId}`;

    this.emit(`  ${ptrName} = alloca ${llvmType}`);

    let initValue = this.generateExpr(stmt.init);
    const initType = this.inferType(stmt.init);

    // Handle implicit integer widening
    initValue = this.convertValue(initValue, initType, stmt.type);

    this.emit(`  store ${llvmType} ${initValue}, ptr ${ptrName}`);

    this.variables.set(stmt.name, {
      llvmName: ptrName,
      type: stmt.type,
      mutable: stmt.mutable,
    });
  }

  private convertValue(value: string, fromType: AST.Type, toType: AST.Type): string {
    const fromLLVM = this.typeToLLVM(fromType);
    const toLLVM = this.typeToLLVM(toType);

    if (fromLLVM === toLLVM) return value;

    // Integer widening
    const fromBits = this.getTypeBits(fromType);
    const toBits = this.getTypeBits(toType);

    if (this.isIntegerType(fromType) && this.isIntegerType(toType)) {
      if (fromBits < toBits) {
        const result = this.nextTemp();
        if (fromType.kind === 'u8') {
          this.emit(`  ${result} = zext ${fromLLVM} ${value} to ${toLLVM}`);
        } else {
          this.emit(`  ${result} = sext ${fromLLVM} ${value} to ${toLLVM}`);
        }
        return result;
      } else if (fromBits > toBits) {
        const result = this.nextTemp();
        this.emit(`  ${result} = trunc ${fromLLVM} ${value} to ${toLLVM}`);
        return result;
      }
    }

    return value;
  }

  private isIntegerType(type: AST.Type): boolean {
    return type.kind === 'i8' || type.kind === 'i32' || type.kind === 'i64' || type.kind === 'u8';
  }

  private generateAssign(stmt: AST.AssignStmt): void {
    if (stmt.target.kind === 'identifier') {
      const varInfo = this.variables.get(stmt.target.name);
      if (!varInfo) {
        throw new CodeGenError(`Undefined variable '${stmt.target.name}'`, stmt.loc.line, stmt.loc.column);
      }
      let value = this.generateExpr(stmt.value);
      const valueType = this.inferType(stmt.value);
      value = this.convertValue(value, valueType, varInfo.type);
      const llvmType = this.typeToLLVM(varInfo.type);
      this.emit(`  store ${llvmType} ${value}, ptr ${varInfo.llvmName}`);
    } else if (stmt.target.kind === 'member') {
      this.generateMemberAssign(stmt.target, stmt.value);
    } else if (stmt.target.kind === 'index') {
      this.generateIndexAssign(stmt.target, stmt.value);
    } else if (stmt.target.kind === 'deref') {
      this.generateDerefAssign(stmt.target, stmt.value);
    } else {
      throw new CodeGenError('Invalid assignment target', stmt.loc.line, stmt.loc.column);
    }
  }

  private generateIndexAssign(target: AST.IndexExpr, value: AST.Expr): void {
    const objType = this.inferType(target.object);
    const indexType = this.inferType(target.index);
    let index = this.generateExpr(target.index);
    const val = this.generateExpr(value);

    // Convert index to i64 if needed
    if (indexType.kind === 'i32') {
      const extended = this.nextTemp();
      this.emit(`  ${extended} = sext i32 ${index} to i64`);
      index = extended;
    }

    if (objType.kind === 'array') {
      const objPtr = this.generateExprPtr(target.object);
      const elemType = this.typeToLLVM(objType.element);
      const gepResult = this.nextTemp();
      this.emit(`  ${gepResult} = getelementptr inbounds ${this.typeToLLVM(objType)}, ptr ${objPtr}, i64 0, i64 ${index}`);
      this.emit(`  store ${elemType} ${val}, ptr ${gepResult}`);
    } else if (objType.kind === 'ptr') {
      const objVal = this.generateExpr(target.object);
      const elemType = this.typeToLLVM(objType.inner);
      const gepResult = this.nextTemp();
      this.emit(`  ${gepResult} = getelementptr inbounds ${elemType}, ptr ${objVal}, i64 ${index}`);
      this.emit(`  store ${elemType} ${val}, ptr ${gepResult}`);
    } else {
      throw new CodeGenError('Cannot index assign to this type', target.loc.line, target.loc.column);
    }
  }

  private generateDerefAssign(target: AST.DerefExpr, value: AST.Expr): void {
    const ptr = this.generateExpr(target.operand);
    const ptrType = this.inferType(target.operand);
    if (ptrType.kind !== 'ptr') {
      throw new CodeGenError('Cannot dereference non-pointer type', target.loc.line, target.loc.column);
    }
    const val = this.generateExpr(value);
    const elemType = this.typeToLLVM(ptrType.inner);
    this.emit(`  store ${elemType} ${val}, ptr ${ptr}`);
  }

  private generateMemberAssign(member: AST.MemberExpr, value: AST.Expr): void {
    const objPtr = this.generateExprPtr(member.object);
    const objType = this.inferType(member.object);

    if (objType.kind !== 'named') {
      throw new CodeGenError('Cannot access member of non-struct type', member.loc.line, member.loc.column);
    }

    const structInfo = this.structs.get(objType.name);
    if (!structInfo) {
      throw new CodeGenError(`Unknown struct type '${objType.name}'`, member.loc.line, member.loc.column);
    }

    const fieldIndex = structInfo.fields.findIndex(f => f.name === member.field);
    if (fieldIndex === -1) {
      throw new CodeGenError(`Unknown field '${member.field}' in struct '${objType.name}'`, member.loc.line, member.loc.column);
    }

    const fieldType = structInfo.fields[fieldIndex].type;
    const llvmFieldType = this.typeToLLVM(fieldType);
    const gepResult = this.nextTemp();
    this.emit(`  ${gepResult} = getelementptr inbounds %${objType.name}, ptr ${objPtr}, i32 0, i32 ${fieldIndex}`);

    const valueResult = this.generateExpr(value);
    this.emit(`  store ${llvmFieldType} ${valueResult}, ptr ${gepResult}`);
  }

  private generateIf(stmt: AST.IfStmt): void {
    const condValue = this.generateExpr(stmt.condition);
    const thenLabel = this.nextLabel('then');
    const endLabel = this.nextLabel('endif');

    let elseLabel = endLabel;
    if (stmt.elseIfs.length > 0 || stmt.elseBlock) {
      elseLabel = this.nextLabel('else');
    }

    this.emit(`  br i1 ${condValue}, label %${thenLabel}, label %${elseLabel}`);

    // Then block
    this.emit(`${thenLabel}:`);
    for (const s of stmt.thenBlock) {
      this.generateStmt(s);
    }
    if (!this.blockEndsWithReturn(stmt.thenBlock)) {
      this.emit(`  br label %${endLabel}`);
    }

    // Else-if blocks
    let currentElseLabel = elseLabel;
    for (let i = 0; i < stmt.elseIfs.length; i++) {
      const elif = stmt.elseIfs[i];
      this.emit(`${currentElseLabel}:`);

      const elifCondValue = this.generateExpr(elif.condition);
      const elifThenLabel = this.nextLabel('elifthen');
      const nextElseLabel = i < stmt.elseIfs.length - 1 || stmt.elseBlock
        ? this.nextLabel('else')
        : endLabel;

      this.emit(`  br i1 ${elifCondValue}, label %${elifThenLabel}, label %${nextElseLabel}`);

      this.emit(`${elifThenLabel}:`);
      for (const s of elif.block) {
        this.generateStmt(s);
      }
      if (!this.blockEndsWithReturn(elif.block)) {
        this.emit(`  br label %${endLabel}`);
      }

      currentElseLabel = nextElseLabel;
    }

    // Else block
    if (stmt.elseBlock) {
      this.emit(`${currentElseLabel}:`);
      for (const s of stmt.elseBlock) {
        this.generateStmt(s);
      }
      if (!this.blockEndsWithReturn(stmt.elseBlock)) {
        this.emit(`  br label %${endLabel}`);
      }
    } else if (stmt.elseIfs.length === 0 && currentElseLabel !== endLabel) {
      this.emit(`${currentElseLabel}:`);
      this.emit(`  br label %${endLabel}`);
    }

    this.emit(`${endLabel}:`);
  }

  private generateWhile(stmt: AST.WhileStmt): void {
    const condLabel = this.nextLabel('while_cond');
    const bodyLabel = this.nextLabel('while_body');
    const endLabel = this.nextLabel('while_end');

    this.emit(`  br label %${condLabel}`);
    this.emit(`${condLabel}:`);

    const condValue = this.generateExpr(stmt.condition);
    this.emit(`  br i1 ${condValue}, label %${bodyLabel}, label %${endLabel}`);

    this.emit(`${bodyLabel}:`);
    for (const s of stmt.body) {
      this.generateStmt(s);
    }
    this.emit(`  br label %${condLabel}`);

    this.emit(`${endLabel}:`);
  }

  private generateFor(stmt: AST.ForStmt): void {
    // for i in start..end is equivalent to:
    // let mut i = start
    // while i < end
    //   body
    //   i = i + 1
    // end

    const uniqueId = this.varCounter++;
    const ptrName = `%${stmt.variable}.${uniqueId}`;
    this.emit(`  ${ptrName} = alloca i32`);

    const startValue = this.generateExpr(stmt.start);
    this.emit(`  store i32 ${startValue}, ptr ${ptrName}`);

    this.variables.set(stmt.variable, {
      llvmName: ptrName,
      type: { kind: 'i32' },
      mutable: true,
    });

    const condLabel = this.nextLabel('for_cond');
    const bodyLabel = this.nextLabel('for_body');
    const endLabel = this.nextLabel('for_end');

    this.emit(`  br label %${condLabel}`);
    this.emit(`${condLabel}:`);

    const currentValue = this.nextTemp();
    this.emit(`  ${currentValue} = load i32, ptr ${ptrName}`);
    const endValue = this.generateExpr(stmt.end);
    const cmpResult = this.nextTemp();
    this.emit(`  ${cmpResult} = icmp slt i32 ${currentValue}, ${endValue}`);
    this.emit(`  br i1 ${cmpResult}, label %${bodyLabel}, label %${endLabel}`);

    this.emit(`${bodyLabel}:`);
    for (const s of stmt.body) {
      this.generateStmt(s);
    }

    // Increment
    const incLoad = this.nextTemp();
    this.emit(`  ${incLoad} = load i32, ptr ${ptrName}`);
    const incResult = this.nextTemp();
    this.emit(`  ${incResult} = add i32 ${incLoad}, 1`);
    this.emit(`  store i32 ${incResult}, ptr ${ptrName}`);
    this.emit(`  br label %${condLabel}`);

    this.emit(`${endLabel}:`);
  }

  private generateReturn(stmt: AST.ReturnStmt): void {
    if (stmt.value) {
      const value = this.generateExpr(stmt.value);
      const type = this.inferType(stmt.value);
      this.emit(`  ret ${this.typeToLLVM(type)} ${value}`);
    } else {
      this.emit('  ret void');
    }
  }

  private generateExpr(expr: AST.Expr): string {
    switch (expr.kind) {
      case 'integer':
        return expr.value.toString();

      case 'float':
        // Use hexadecimal representation for floats to avoid precision issues
        const buffer = new ArrayBuffer(8);
        const view = new DataView(buffer);
        view.setFloat64(0, expr.value, false);
        const hex = '0x' + Array.from(new Uint8Array(buffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        return hex;

      case 'string':
        return this.getStringConstant(expr.value);

      case 'bool':
        return expr.value ? '1' : '0';

      case 'identifier':
        return this.generateIdentifier(expr);

      case 'binary':
        return this.generateBinary(expr);

      case 'unary':
        return this.generateUnary(expr);

      case 'call':
        return this.generateCall(expr);

      case 'member':
        return this.generateMember(expr);

      case 'struct_literal':
        return this.generateStructLiteral(expr);

      case 'index':
        return this.generateIndex(expr);

      case 'null':
        return 'null';

      case 'address_of':
        return this.generateAddressOf(expr);

      case 'deref':
        return this.generateDeref(expr);

      case 'cast':
        return this.generateCast(expr);

      case 'sizeof':
        return this.generateSizeof(expr);
    }
  }

  private generateIndex(expr: AST.IndexExpr): string {
    const objType = this.inferType(expr.object);
    const indexType = this.inferType(expr.index);
    let index = this.generateExpr(expr.index);

    // Convert index to i64 if needed
    if (indexType.kind === 'i32') {
      const extended = this.nextTemp();
      this.emit(`  ${extended} = sext i32 ${index} to i64`);
      index = extended;
    }

    if (objType.kind === 'array') {
      const objPtr = this.generateExprPtr(expr.object);
      const elemType = this.typeToLLVM(objType.element);
      const gepResult = this.nextTemp();
      this.emit(`  ${gepResult} = getelementptr inbounds ${this.typeToLLVM(objType)}, ptr ${objPtr}, i64 0, i64 ${index}`);
      const loadResult = this.nextTemp();
      this.emit(`  ${loadResult} = load ${elemType}, ptr ${gepResult}`);
      return loadResult;
    } else if (objType.kind === 'ptr') {
      const objVal = this.generateExpr(expr.object);
      const elemType = this.typeToLLVM(objType.inner);
      const gepResult = this.nextTemp();
      this.emit(`  ${gepResult} = getelementptr inbounds ${elemType}, ptr ${objVal}, i64 ${index}`);
      const loadResult = this.nextTemp();
      this.emit(`  ${loadResult} = load ${elemType}, ptr ${gepResult}`);
      return loadResult;
    } else if (objType.kind === 'str') {
      // String indexing returns a byte
      const objVal = this.generateExpr(expr.object);
      const gepResult = this.nextTemp();
      this.emit(`  ${gepResult} = getelementptr inbounds i8, ptr ${objVal}, i64 ${index}`);
      const loadResult = this.nextTemp();
      this.emit(`  ${loadResult} = load i8, ptr ${gepResult}`);
      return loadResult;
    }

    throw new CodeGenError('Cannot index into this type', expr.loc.line, expr.loc.column);
  }

  private generateAddressOf(expr: AST.AddressOfExpr): string {
    return this.generateExprPtr(expr.operand);
  }

  private generateDeref(expr: AST.DerefExpr): string {
    const ptr = this.generateExpr(expr.operand);
    const ptrType = this.inferType(expr.operand);
    if (ptrType.kind !== 'ptr') {
      throw new CodeGenError('Cannot dereference non-pointer type', expr.loc.line, expr.loc.column);
    }
    const elemType = this.typeToLLVM(ptrType.inner);
    const result = this.nextTemp();
    this.emit(`  ${result} = load ${elemType}, ptr ${ptr}`);
    return result;
  }

  private generateCast(expr: AST.CastExpr): string {
    const value = this.generateExpr(expr.expr);
    const srcType = this.inferType(expr.expr);
    const dstType = expr.targetType;
    const result = this.nextTemp();

    const srcLLVM = this.typeToLLVM(srcType);
    const dstLLVM = this.typeToLLVM(dstType);

    // Same type - no cast needed
    if (srcLLVM === dstLLVM) return value;

    // Pointer casts - just bitcast (in opaque ptr, this is a no-op)
    if (srcType.kind === 'ptr' || dstType.kind === 'ptr') {
      return value; // With opaque pointers, no cast needed
    }

    // Integer to integer
    const srcBits = this.getTypeBits(srcType);
    const dstBits = this.getTypeBits(dstType);

    if (srcBits < dstBits) {
      // Extend
      if (srcType.kind === 'u8') {
        this.emit(`  ${result} = zext ${srcLLVM} ${value} to ${dstLLVM}`);
      } else {
        this.emit(`  ${result} = sext ${srcLLVM} ${value} to ${dstLLVM}`);
      }
    } else if (srcBits > dstBits) {
      // Truncate
      this.emit(`  ${result} = trunc ${srcLLVM} ${value} to ${dstLLVM}`);
    } else {
      return value;
    }

    return result;
  }

  private generateSizeof(expr: AST.SizeOfExpr): string {
    const llvmType = this.typeToLLVM(expr.targetType);
    const result = this.nextTemp();
    const ptrResult = this.nextTemp();
    // sizeof trick: getelementptr from null, then ptrtoint
    this.emit(`  ${ptrResult} = getelementptr ${llvmType}, ptr null, i32 1`);
    this.emit(`  ${result} = ptrtoint ptr ${ptrResult} to i64`);
    return result;
  }

  private getTypeBits(type: AST.Type): number {
    switch (type.kind) {
      case 'i8': case 'u8': case 'bool': return 8;
      case 'i32': return 32;
      case 'i64': return 64;
      case 'f32': return 32;
      case 'f64': return 64;
      default: return 64; // pointers
    }
  }

  private generateExprPtr(expr: AST.Expr): string {
    if (expr.kind === 'identifier') {
      const varInfo = this.variables.get(expr.name);
      if (!varInfo) {
        throw new CodeGenError(`Undefined variable '${expr.name}'`, expr.loc.line, expr.loc.column);
      }
      return varInfo.llvmName;
    }
    if (expr.kind === 'deref') {
      // ^ptr is already a pointer dereference, so the address is just the ptr value
      return this.generateExpr(expr.operand);
    }
    if (expr.kind === 'index') {
      const objType = this.inferType(expr.object);
      const indexType = this.inferType(expr.index);
      let index = this.generateExpr(expr.index);

      // Convert index to i64 if needed
      if (indexType.kind === 'i32') {
        const extended = this.nextTemp();
        this.emit(`  ${extended} = sext i32 ${index} to i64`);
        index = extended;
      }

      if (objType.kind === 'array') {
        const objPtr = this.generateExprPtr(expr.object);
        const gepResult = this.nextTemp();
        this.emit(`  ${gepResult} = getelementptr inbounds ${this.typeToLLVM(objType)}, ptr ${objPtr}, i64 0, i64 ${index}`);
        return gepResult;
      } else if (objType.kind === 'ptr') {
        const objVal = this.generateExpr(expr.object);
        const elemType = this.typeToLLVM(objType.inner);
        const gepResult = this.nextTemp();
        this.emit(`  ${gepResult} = getelementptr inbounds ${elemType}, ptr ${objVal}, i64 ${index}`);
        return gepResult;
      }
    }
    if (expr.kind === 'member') {
      const objPtr = this.generateExprPtr(expr.object);
      const objType = this.inferType(expr.object);
      if (objType.kind !== 'named') {
        throw new CodeGenError('Cannot access member of non-struct type', expr.loc.line, expr.loc.column);
      }
      const structInfo = this.structs.get(objType.name);
      if (!structInfo) {
        throw new CodeGenError(`Unknown struct type '${objType.name}'`, expr.loc.line, expr.loc.column);
      }
      const fieldIndex = structInfo.fields.findIndex(f => f.name === expr.field);
      if (fieldIndex === -1) {
        throw new CodeGenError(`Unknown field '${expr.field}'`, expr.loc.line, expr.loc.column);
      }
      const gepResult = this.nextTemp();
      this.emit(`  ${gepResult} = getelementptr inbounds %${objType.name}, ptr ${objPtr}, i32 0, i32 ${fieldIndex}`);
      return gepResult;
    }
    throw new CodeGenError('Cannot get pointer to expression', expr.loc.line, expr.loc.column);
  }

  private generateIdentifier(expr: AST.Identifier): string {
    const varInfo = this.variables.get(expr.name);
    if (!varInfo) {
      throw new CodeGenError(`Undefined variable '${expr.name}'`, expr.loc.line, expr.loc.column);
    }
    const result = this.nextTemp();
    this.emit(`  ${result} = load ${this.typeToLLVM(varInfo.type)}, ptr ${varInfo.llvmName}`);
    return result;
  }

  private generateBinary(expr: AST.BinaryExpr): string {
    const left = this.generateExpr(expr.left);
    const right = this.generateExpr(expr.right);
    const leftType = this.inferType(expr.left);
    const rightType = this.inferType(expr.right);
    const result = this.nextTemp();

    const isFloat = leftType.kind === 'f32' || leftType.kind === 'f64';
    const isSigned = leftType.kind === 'i32' || leftType.kind === 'i64' || leftType.kind === 'i8';
    const llvmType = this.typeToLLVM(leftType);

    switch (expr.op) {
      case '+':
        // Handle pointer arithmetic: ptr + int
        if (leftType.kind === 'ptr') {
          let offset = right;
          if (rightType.kind === 'i32') {
            const extended = this.nextTemp();
            this.emit(`  ${extended} = sext i32 ${right} to i64`);
            offset = extended;
          }
          const elemType = this.typeToLLVM(leftType.inner);
          this.emit(`  ${result} = getelementptr inbounds ${elemType}, ptr ${left}, i64 ${offset}`);
        } else {
          this.emit(`  ${result} = ${isFloat ? 'fadd' : 'add'} ${llvmType} ${left}, ${right}`);
        }
        break;
      case '-':
        // Handle pointer arithmetic: ptr - int
        if (leftType.kind === 'ptr' && this.isIntegerType(rightType)) {
          let offset = right;
          if (rightType.kind === 'i32') {
            const extended = this.nextTemp();
            this.emit(`  ${extended} = sext i32 ${right} to i64`);
            offset = extended;
          }
          const negOffset = this.nextTemp();
          this.emit(`  ${negOffset} = sub i64 0, ${offset}`);
          const elemType = this.typeToLLVM(leftType.inner);
          this.emit(`  ${result} = getelementptr inbounds ${elemType}, ptr ${left}, i64 ${negOffset}`);
        } else {
          this.emit(`  ${result} = ${isFloat ? 'fsub' : 'sub'} ${llvmType} ${left}, ${right}`);
        }
        break;
      case '*':
        this.emit(`  ${result} = ${isFloat ? 'fmul' : 'mul'} ${llvmType} ${left}, ${right}`);
        break;
      case '/':
        if (isFloat) {
          this.emit(`  ${result} = fdiv ${llvmType} ${left}, ${right}`);
        } else if (isSigned) {
          this.emit(`  ${result} = sdiv ${llvmType} ${left}, ${right}`);
        } else {
          this.emit(`  ${result} = udiv ${llvmType} ${left}, ${right}`);
        }
        break;
      case '%':
        if (isSigned) {
          this.emit(`  ${result} = srem ${llvmType} ${left}, ${right}`);
        } else {
          this.emit(`  ${result} = urem ${llvmType} ${left}, ${right}`);
        }
        break;
      case '==':
        this.emit(`  ${result} = ${isFloat ? 'fcmp oeq' : 'icmp eq'} ${llvmType} ${left}, ${right}`);
        break;
      case '!=':
        this.emit(`  ${result} = ${isFloat ? 'fcmp one' : 'icmp ne'} ${llvmType} ${left}, ${right}`);
        break;
      case '<':
        if (isFloat) {
          this.emit(`  ${result} = fcmp olt ${llvmType} ${left}, ${right}`);
        } else if (isSigned) {
          this.emit(`  ${result} = icmp slt ${llvmType} ${left}, ${right}`);
        } else {
          this.emit(`  ${result} = icmp ult ${llvmType} ${left}, ${right}`);
        }
        break;
      case '>':
        if (isFloat) {
          this.emit(`  ${result} = fcmp ogt ${llvmType} ${left}, ${right}`);
        } else if (isSigned) {
          this.emit(`  ${result} = icmp sgt ${llvmType} ${left}, ${right}`);
        } else {
          this.emit(`  ${result} = icmp ugt ${llvmType} ${left}, ${right}`);
        }
        break;
      case '<=':
        if (isFloat) {
          this.emit(`  ${result} = fcmp ole ${llvmType} ${left}, ${right}`);
        } else if (isSigned) {
          this.emit(`  ${result} = icmp sle ${llvmType} ${left}, ${right}`);
        } else {
          this.emit(`  ${result} = icmp ule ${llvmType} ${left}, ${right}`);
        }
        break;
      case '>=':
        if (isFloat) {
          this.emit(`  ${result} = fcmp oge ${llvmType} ${left}, ${right}`);
        } else if (isSigned) {
          this.emit(`  ${result} = icmp sge ${llvmType} ${left}, ${right}`);
        } else {
          this.emit(`  ${result} = icmp uge ${llvmType} ${left}, ${right}`);
        }
        break;
      case 'and':
        this.emit(`  ${result} = and i1 ${left}, ${right}`);
        break;
      case 'or':
        this.emit(`  ${result} = or i1 ${left}, ${right}`);
        break;
    }

    return result;
  }

  private generateUnary(expr: AST.UnaryExpr): string {
    const operand = this.generateExpr(expr.operand);
    const operandType = this.inferType(expr.operand);
    const result = this.nextTemp();

    switch (expr.op) {
      case '-':
        if (operandType.kind === 'f32' || operandType.kind === 'f64') {
          this.emit(`  ${result} = fneg ${this.typeToLLVM(operandType)} ${operand}`);
        } else {
          this.emit(`  ${result} = sub ${this.typeToLLVM(operandType)} 0, ${operand}`);
        }
        break;
      case 'not':
        this.emit(`  ${result} = xor i1 ${operand}, 1`);
        break;
    }

    return result;
  }

  private generateCall(expr: AST.CallExpr): string {
    const fnInfo = this.functions.get(expr.callee);
    if (!fnInfo) {
      throw new CodeGenError(`Unknown function '${expr.callee}'`, expr.loc.line, expr.loc.column);
    }

    const args = expr.args.map((arg, i) => {
      const value = this.generateExpr(arg);
      const type = this.typeToLLVM(fnInfo.params[i].type);
      return `${type} ${value}`;
    }).join(', ');

    const retType = this.typeToLLVM(fnInfo.returnType);

    if (fnInfo.returnType.kind === 'void') {
      this.emit(`  call ${retType} @${expr.callee}(${args})`);
      return '';
    } else {
      const result = this.nextTemp();
      this.emit(`  ${result} = call ${retType} @${expr.callee}(${args})`);
      return result;
    }
  }

  private generateMember(expr: AST.MemberExpr): string {
    const objPtr = this.generateExprPtr(expr.object);
    const objType = this.inferType(expr.object);

    if (objType.kind !== 'named') {
      throw new CodeGenError('Cannot access member of non-struct type', expr.loc.line, expr.loc.column);
    }

    const structInfo = this.structs.get(objType.name);
    if (!structInfo) {
      throw new CodeGenError(`Unknown struct type '${objType.name}'`, expr.loc.line, expr.loc.column);
    }

    const fieldIndex = structInfo.fields.findIndex(f => f.name === expr.field);
    if (fieldIndex === -1) {
      throw new CodeGenError(`Unknown field '${expr.field}' in struct '${objType.name}'`, expr.loc.line, expr.loc.column);
    }

    const fieldType = structInfo.fields[fieldIndex].type;
    const llvmFieldType = this.typeToLLVM(fieldType);
    const gepResult = this.nextTemp();
    this.emit(`  ${gepResult} = getelementptr inbounds %${objType.name}, ptr ${objPtr}, i32 0, i32 ${fieldIndex}`);

    const loadResult = this.nextTemp();
    this.emit(`  ${loadResult} = load ${llvmFieldType}, ptr ${gepResult}`);
    return loadResult;
  }

  private generateStructLiteral(expr: AST.StructLiteral): string {
    const structInfo = this.structs.get(expr.name);
    if (!structInfo) {
      throw new CodeGenError(`Unknown struct type '${expr.name}'`, expr.loc.line, expr.loc.column);
    }

    // Allocate temporary struct on stack
    const structPtr = this.nextTemp();
    this.emit(`  ${structPtr} = alloca %${expr.name}`);

    // Initialize each field
    for (const field of expr.fields) {
      const fieldIndex = structInfo.fields.findIndex(f => f.name === field.name);
      if (fieldIndex === -1) {
        throw new CodeGenError(`Unknown field '${field.name}' in struct '${expr.name}'`, expr.loc.line, expr.loc.column);
      }

      const fieldType = structInfo.fields[fieldIndex].type;
      const llvmFieldType = this.typeToLLVM(fieldType);
      const fieldPtr = this.nextTemp();
      this.emit(`  ${fieldPtr} = getelementptr inbounds %${expr.name}, ptr ${structPtr}, i32 0, i32 ${fieldIndex}`);

      const fieldValue = this.generateExpr(field.value);
      this.emit(`  store ${llvmFieldType} ${fieldValue}, ptr ${fieldPtr}`);
    }

    // Load the struct value
    const result = this.nextTemp();
    this.emit(`  ${result} = load %${expr.name}, ptr ${structPtr}`);
    return result;
  }

  private inferType(expr: AST.Expr): AST.Type {
    switch (expr.kind) {
      case 'integer':
        return { kind: 'i32' };
      case 'float':
        return { kind: 'f64' };
      case 'string':
        return { kind: 'str' };
      case 'bool':
        return { kind: 'bool' };
      case 'identifier': {
        const varInfo = this.variables.get(expr.name);
        if (!varInfo) {
          throw new CodeGenError(`Undefined variable '${expr.name}'`, expr.loc.line, expr.loc.column);
        }
        return varInfo.type;
      }
      case 'binary':
        if (['==', '!=', '<', '>', '<=', '>=', 'and', 'or'].includes(expr.op)) {
          return { kind: 'bool' };
        }
        return this.inferType(expr.left);
      case 'unary':
        if (expr.op === 'not') return { kind: 'bool' };
        return this.inferType(expr.operand);
      case 'call': {
        const fnInfo = this.functions.get(expr.callee);
        if (!fnInfo) {
          throw new CodeGenError(`Unknown function '${expr.callee}'`, expr.loc.line, expr.loc.column);
        }
        return fnInfo.returnType;
      }
      case 'member': {
        const objType = this.inferType(expr.object);
        if (objType.kind !== 'named') {
          throw new CodeGenError('Cannot access member of non-struct type', expr.loc.line, expr.loc.column);
        }
        const structInfo = this.structs.get(objType.name);
        if (!structInfo) {
          throw new CodeGenError(`Unknown struct type '${objType.name}'`, expr.loc.line, expr.loc.column);
        }
        const field = structInfo.fields.find(f => f.name === expr.field);
        if (!field) {
          throw new CodeGenError(`Unknown field '${expr.field}'`, expr.loc.line, expr.loc.column);
        }
        return field.type;
      }
      case 'struct_literal':
        return { kind: 'named', name: expr.name };
      case 'index': {
        const objType = this.inferType(expr.object);
        if (objType.kind === 'array') {
          return objType.element;
        } else if (objType.kind === 'ptr') {
          return objType.inner;
        } else if (objType.kind === 'str') {
          return { kind: 'i8' };
        }
        throw new CodeGenError('Cannot index into this type', expr.loc.line, expr.loc.column);
      }
      case 'null':
        return { kind: 'ptr', inner: { kind: 'void' } };
      case 'address_of': {
        const operandType = this.inferType(expr.operand);
        return { kind: 'ptr', inner: operandType };
      }
      case 'deref': {
        const ptrType = this.inferType(expr.operand);
        if (ptrType.kind !== 'ptr') {
          throw new CodeGenError('Cannot dereference non-pointer type', expr.loc.line, expr.loc.column);
        }
        return ptrType.inner;
      }
      case 'cast':
        return expr.targetType;
      case 'sizeof':
        return { kind: 'i64' };
    }
  }

  private typeToLLVM(type: AST.Type): string {
    switch (type.kind) {
      case 'i8': return 'i8';
      case 'i32': return 'i32';
      case 'i64': return 'i64';
      case 'u8': return 'i8';
      case 'f32': return 'float';
      case 'f64': return 'double';
      case 'bool': return 'i1';
      case 'void': return 'void';
      case 'str': return 'ptr';
      case 'named': return `%${type.name}`;
      case 'ptr': return 'ptr';
      case 'array':
        if (type.size !== null) {
          return `[${type.size} x ${this.typeToLLVM(type.element)}]`;
        }
        return 'ptr'; // Unsized arrays decay to pointers
    }
  }

  private getStringConstant(str: string): string {
    if (this.strings.has(str)) {
      const name = this.strings.get(str)!;
      return name;
    }
    const name = `@.str.${this.stringCounter++}`;
    this.strings.set(str, name);
    return name;
  }

  private escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\5C')
      .replace(/"/g, '\\22')
      .replace(/\n/g, '\\0A')
      .replace(/\r/g, '\\0D')
      .replace(/\t/g, '\\09');
  }

  private nextTemp(): string {
    return `%t${this.tempCounter++}`;
  }

  private nextLabel(prefix: string): string {
    return `${prefix}.${this.labelCounter++}`;
  }

  private emit(line: string): void {
    this.output.push(line);
  }

  private blockEndsWithReturn(block: AST.Stmt[]): boolean {
    if (block.length === 0) return false;
    const last = block[block.length - 1];
    return last.kind === 'return';
  }
}
