class TreeNode:

    def __init__(self, value):
        self.value = value
        self.left = None
        self.right = None


class BinaryTree:

    def __init__(self):
        self.root = None


    def insert(self, value):

        new_node = TreeNode(value)

        if self.root is None:
            self.root = new_node

        else:
            self._insert_recursive(self.root, new_node)


    def _insert_recursive(self, current, new_node):

        if new_node.value < current.value:

            if current.left is None:
                current.left = new_node

            else:
                self._insert_recursive(
                    current.left,
                    new_node
                )

        else:

            if current.right is None:
                current.right = new_node

            else:
                self._insert_recursive(
                    current.right,
                    new_node
                )


    def print_tree(self):

        print("\nBinary Tree:")

        self._print_recursive(self.root)


    def _print_recursive(self, node):

        if node is not None:

            self._print_recursive(node.left)

            print(node.value)

            self._print_recursive(node.right)


tree = BinaryTree()

tree.insert(50)
tree.insert(30)
tree.insert(70)
tree.insert(20)
tree.insert(40)
tree.insert(60)
tree.insert(80)

tree.print_tree()