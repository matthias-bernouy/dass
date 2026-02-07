import ts from "typescript";

export function getTSFileInfo(filePath: string) {
  const program = ts.createProgram([filePath], { allowJs: true });
  const sourceFile = program.getSourceFile(filePath);
  const checker = program.getTypeChecker();

  if (!sourceFile) return;

  const info = {
    classes: [] as any[],
    functions: [] as any[]
  };

  ts.forEachChild(sourceFile, (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
      const signature = checker.getSignatureFromDeclaration(node);
      const returnType = checker.getReturnTypeOfSignature(signature!);
      
      info.functions.push({
        name: node.name.getText(),
        returnType: checker.typeToString(returnType),
        parameters: node.parameters.map(p => ({
          name: p.name.getText(),
          type: checker.typeToString(checker.getTypeAtLocation(p))
        }))
      });
    }

    if (ts.isClassDeclaration(node) && node.name) {
      const methods: any[] = [];
      node.members.forEach(member => {
        if (ts.isMethodDeclaration(member)) {
          const signature = checker.getSignatureFromDeclaration(member);
          const returnType = checker.getReturnTypeOfSignature(signature!);
          methods.push({
            name: member.name.getText(),
            returnType: checker.typeToString(returnType)
          });
        }
      });
      info.classes.push({ name: node.name.getText(), methods });
    }
  });

  return info;
}